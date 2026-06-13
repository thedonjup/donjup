import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  safeErrorListItem,
  serviceUnavailableResponse,
} from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { revalidatePublicDataCaches } from "@/lib/cache-revalidation";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";

export const maxDuration = 300;

const KAPT_LIST_URL = "https://apis.data.go.kr/1613000/AptListService3/getSigunguAptList3";
const KAPT_INFO_URL = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusBassInfoV4";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("geocode-kapt");
  if (databaseUnavailable) return databaseUnavailable;

  const molitKey = process.env.MOLIT_API_KEY;
  const kakaoKey = process.env.KAKAO_REST_KEY;
  if (!molitKey || !kakaoKey) {
    return serviceUnavailableResponse();
  }

  // 좌표 없는 단지가 가장 많은 시군구 (이미 주소 있는 건 제외)
  const noGeoRegions = await db.execute(sql`
    SELECT LEFT(region_code, 5) as sigungu, COUNT(*) as cnt
    FROM apt_complexes
    WHERE latitude IS NULL AND address IS NULL
    GROUP BY LEFT(region_code, 5)
    ORDER BY cnt DESC
    LIMIT 5
  `);

  const sigunguCodes = noGeoRegions.rows.map((r) => String(r.sigungu));
  if (sigunguCodes.length === 0) {
    return NextResponse.json({ success: true, message: "No regions to process", updated: 0 });
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const sigungu of sigunguCodes) {
    try {
      // 1. K-apt 단지 목록 조회 (시군구별)
      const listRes = await fetch(
        `${KAPT_LIST_URL}?serviceKey=${molitKey}&sigunguCode=${sigungu}&pageNo=1&numOfRows=500`
      );
      if (!listRes.ok) { errors.push(`List API ${sigungu}: ${listRes.status}`); continue; }

      const listData = await listRes.json();
      const items = listData?.response?.body?.items ?? [];
      if (!Array.isArray(items) || items.length === 0) { skipped++; continue; }

      // 2. 주소+좌표 없는 우리 DB 단지 조회
      const noGeoComplexes = await db
        .select({ id: aptComplexes.id, aptName: aptComplexes.aptName, regionCode: aptComplexes.regionCode })
        .from(aptComplexes)
        .where(sql`${aptComplexes.latitude} IS NULL AND ${aptComplexes.address} IS NULL AND LEFT(${aptComplexes.regionCode}, 5) = ${sigungu}`)
        .limit(200);

      if (noGeoComplexes.length === 0) continue;

      // 3. kaptName → aptName 퍼지 매칭
      const normalize = (s: string) => s.replace(/[\s\-()（）··.]/g, "").toLowerCase();
      for (const complex of noGeoComplexes) {
        const normName = normalize(complex.aptName);
        const matched = items.find((item: { kaptName?: string }) => {
          const kn = normalize(item.kaptName ?? "");
          return kn === normName || kn.includes(normName) || normName.includes(kn);
        });

        if (!matched) {
          // K-apt에 없는 단지 — address를 빈값으로 마킹해서 재시도 방지
          await db.update(aptComplexes).set({ address: "" }).where(eq(aptComplexes.id, complex.id));
          skipped++;
          continue;
        }

        // 4. kaptCode로 상세정보 (주소) 조회
        const infoRes = await fetch(
          `${KAPT_INFO_URL}?serviceKey=${molitKey}&kaptCode=${matched.kaptCode}`
        );
        if (!infoRes.ok) { skipped++; continue; }

        const infoData = await infoRes.json();
        const item = infoData?.response?.body?.item;
        if (!item) { skipped++; continue; }

        const address = item.doroJuso || item.kaptAddr || "";
        if (!address) { skipped++; continue; }

        // 5. 카카오 지오코딩 (정확한 주소 기반)
        let lat: number | null = null;
        let lng: number | null = null;

        // 도로명주소로 검색
        const addrRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
          { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
        );
        if (addrRes.ok) {
          const addrData = await addrRes.json();
          if (addrData.documents?.length > 0) {
            lat = parseFloat(addrData.documents[0].y);
            lng = parseFloat(addrData.documents[0].x);
          }
        }

        // 주소 검색 실패시 키워드 검색
        if (lat === null) {
          const kwRes = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`,
            { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
          );
          if (kwRes.ok) {
            const kwData = await kwRes.json();
            if (kwData.documents?.length > 0) {
              lat = parseFloat(kwData.documents[0].y);
              lng = parseFloat(kwData.documents[0].x);
            }
          }
        }

        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
          await db.update(aptComplexes)
            .set({
              latitude: String(lat),
              longitude: String(lng),
              address: address,
            })
            .where(eq(aptComplexes.id, complex.id));
          updated++;
        } else {
          skipped++;
        }

        await new Promise((r) => setTimeout(r, 50));
      }
    } catch (err) {
      errors.push(safeErrorListItem(sigungu, err));
    }
  }

  const cacheRevalidation = updated > 0
    ? revalidatePublicDataCaches(
        [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
        {
          route: "/api/cron/geocode-kapt",
          updated,
        }
      )
    : undefined;

  return NextResponse.json({
    success: true,
    regions: sigunguCodes,
    updated,
    skipped,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    cacheRevalidation,
  });
}
