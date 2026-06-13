import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import {
  safeErrorListItem,
  safeErrorMessage,
  serviceUnavailableResponse,
} from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { revalidatePublicDataCaches } from "@/lib/cache-revalidation";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

export const maxDuration = 300; // 5분

const GEOCODE_REGION_HINTS = [
  { dong: "감정동", region: "경기 김포" },
  { dong: "양벌동", region: "경기 광주" },
  { dong: "신현동", region: "경기 광주" },
  { dong: "쌍령동", region: "경기 광주" },
  { dong: "태전동", region: "경기 광주" },
  { dong: "강내면 월곡리", region: "충북 청주" },
] as const;

function regionNameFromCode(regionCode: string | null | undefined): string | null {
  if (!regionCode || regionCode.length < 5) return null;

  const sido = REGION_HIERARCHY[regionCode.slice(0, 2)];
  const sigunguName = sido?.sigungu?.[regionCode];
  if (!sido || !sigunguName) return null;

  return `${sido.shortName} ${sigunguName}`;
}

function regionHintsForDong(dongName: string | null | undefined): string[] {
  if (!dongName) return [];

  return GEOCODE_REGION_HINTS
    .filter((hint) => dongName.includes(hint.dong))
    .map((hint) => hint.region);
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("geocode-complexes");
  if (databaseUnavailable) return databaseUnavailable;

  const restKey = process.env.KAKAO_REST_KEY;
  if (!restKey) {
    return serviceUnavailableResponse();
  }

  let complexes;
  try {
    complexes = await db
      .select({
        id: aptComplexes.id,
        region_code: aptComplexes.regionCode,
        address: aptComplexes.address,
        apt_name: aptComplexes.aptName,
        region_name: aptComplexes.regionName,
        dong_name: aptComplexes.dongName,
      })
      .from(aptComplexes)
      .where(isNull(aptComplexes.latitude))
      .limit(80);
  } catch (fetchError) {
    const msg = safeErrorMessage(fetchError);
    logger.error("Geocode-complexes DB fetch failed", { error: fetchError, cron: "geocode-complexes" });
    await sendSlackAlert(`[geocode-complexes] DB 조회 실패: ${msg}`);
    return NextResponse.json({ error: `DB 조회 실패: ${msg}` }, { status: 500 });
  }

  if (!complexes || complexes.length === 0) {
    return NextResponse.json({ success: true, message: "지오코딩할 단지 없음", updated: 0 });
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const complex of complexes) {
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      // 아파트명 정제: 괄호, 특수문자 제거
      const dongName = complex.dong_name?.replace(/\s*(읍|면)\s+\S+리$/, "") || "";
      const cleanName = complex.apt_name
        .replace(/\([^)]*\)/g, "")   // 괄호 내용 제거
        .replace(/[^가-힣a-zA-Z0-9\s]/g, "") // 특수문자 제거
        .trim();
      const regionName = regionNameFromCode(complex.region_code) ?? complex.region_name;

      // Strategy 1: 카카오 키워드 검색 (가장 높은 적중률)
      const keywordQuery = `${regionName} ${dongName} ${cleanName} 아파트`.trim();

      const keywordRes = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keywordQuery)}`,
        { headers: { Authorization: `KakaoAK ${restKey}` } },
      );

      if (keywordRes.ok) {
        const data = await keywordRes.json();
        if (data.documents?.length > 0) {
          // 첫 번째 결과 중 카테고리에 "아파트" 포함하는 것 우선
          const aptDoc = data.documents.find((d: { category_name?: string }) =>
            d.category_name?.includes("아파트")
          ) || data.documents[0];
          lat = parseFloat(aptDoc.y);
          lng = parseFloat(aptDoc.x);
        }
      }

      // Strategy 2: 주소 기반 검색 (키워드 실패시)
      if (lat === null && complex.address) {
        const addrRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(complex.address)}`,
          { headers: { Authorization: `KakaoAK ${restKey}` } },
        );

        if (addrRes.ok) {
          const data = await addrRes.json();
          if (data.documents?.length > 0) {
            lat = parseFloat(data.documents[0].y);
            lng = parseFloat(data.documents[0].x);
          }
        }
      }

      // Strategy 3: 지역명 + 정제된 아파트명
      if (lat === null) {
        const fallbackQuery = `${regionName} ${cleanName}`.trim();
        const fallbackRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(fallbackQuery)}`,
          { headers: { Authorization: `KakaoAK ${restKey}` } },
        );
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (data.documents?.length > 0) {
            lat = parseFloat(data.documents[0].y);
            lng = parseFloat(data.documents[0].x);
          }
        }
      }

      // Strategy 4: 동이름 + 원본 아파트명 (특수문자 포함)
      if (lat === null && complex.dong_name) {
        const rawQuery = `${complex.dong_name} ${complex.apt_name}`.trim();
        const rawRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(rawQuery)}`,
          { headers: { Authorization: `KakaoAK ${restKey}` } },
        );
        if (rawRes.ok) {
          const data = await rawRes.json();
          if (data.documents?.length > 0) {
            lat = parseFloat(data.documents[0].y);
            lng = parseFloat(data.documents[0].x);
          }
        }
      }

      // Strategy 5: 지역명 + 동이름 + 아파트명 (가장 상세한 쿼리)
      if (lat === null) {
        const fullQuery = `${regionName} ${complex.dong_name || ""} ${cleanName}`.trim();
        const fullRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(fullQuery)}`,
          { headers: { Authorization: `KakaoAK ${restKey}` } },
        );
        if (fullRes.ok) {
          const data = await fullRes.json();
          if (data.documents?.length > 0) {
            lat = parseFloat(data.documents[0].y);
            lng = parseFloat(data.documents[0].x);
          }
        }
      }

      // Strategy 6: "아파트" 빼고 검색 (맨션, 빌라 등)
      if (lat === null) {
        const noAptQuery = `${dongName} ${cleanName}`.trim();
        const noAptRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(noAptQuery)}`,
          { headers: { Authorization: `KakaoAK ${restKey}` } },
        );
        if (noAptRes.ok) {
          const data = await noAptRes.json();
          if (data.documents?.length > 0) {
            lat = parseFloat(data.documents[0].y);
            lng = parseFloat(data.documents[0].x);
          }
        }
      }

      // Strategy 7: 동이름만으로 대략적 좌표 (동 중심점)
      if (lat === null && complex.dong_name) {
        const dongQuery = `${regionName} ${complex.dong_name}`.trim();
        const dongRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(dongQuery)}`,
          { headers: { Authorization: `KakaoAK ${restKey}` } },
        );
        if (dongRes.ok) {
          const data = await dongRes.json();
          if (data.documents?.length > 0) {
            lat = parseFloat(data.documents[0].y);
            lng = parseFloat(data.documents[0].x);
          }
        }
      }

      if (lat === null) {
        for (const hintedRegion of regionHintsForDong(complex.dong_name)) {
          const hintedQuery = `${hintedRegion} ${complex.dong_name || ""} ${cleanName} 아파트`.trim();
          const hintedRes = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(hintedQuery)}`,
            { headers: { Authorization: `KakaoAK ${restKey}` } },
          );
          if (!hintedRes.ok) continue;

          const data = await hintedRes.json();
          if (data.documents?.length > 0) {
            const aptDoc = data.documents.find((d: { category_name?: string }) =>
              d.category_name?.includes("아파트")
            ) || data.documents[0];
            lat = parseFloat(aptDoc.y);
            lng = parseFloat(aptDoc.x);
            break;
          }
        }
      }

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        await db
          .update(aptComplexes)
          .set({ latitude: String(lat), longitude: String(lng) })
          .where(eq(aptComplexes.id, complex.id));
        updated++;
      } else {
        skipped++;
        if (errors.length < 20) {
          errors.push(`SKIP: "${keywordQuery}" (dong=${dongName}, region=${regionName})`);
        }
      }

      // Rate limiting: 30ms between requests (카카오 일일 30만건 충분)
      await new Promise((r) => setTimeout(r, 30));
    } catch (err) {
      errors.push(safeErrorListItem(complex.apt_name, err));
    }
  }

  if (errors.length > 0) {
    logger.error("Geocode-complexes had errors", { errorCount: errors.length, cron: "geocode-complexes" });
    await sendSlackAlert(`[geocode-complexes] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  const cacheRevalidation = updated > 0
    ? revalidatePublicDataCaches(
        [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
        {
          route: "/api/cron/geocode-complexes",
          updated,
        }
      )
    : undefined;

  return NextResponse.json({
    success: true,
    total: complexes.length,
    updated,
    skipped,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    cacheRevalidation,
  });
}
