import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchTransactions, delay } from "@/lib/api/molit";
import {
  fetchMultiTransactions,
  delay as multiDelay,
  type ParsedMultiTransaction,
} from "@/lib/api/molit-multi";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
} from "@/lib/constants/property-types";
import type { ParsedTransaction } from "@/lib/api/molit";

export const maxDuration = 300; // 5분 (Vercel Pro)

/** 시/도 코드별 배치 그룹 (0-4) */
const BATCH_GROUPS: Record<number, string[]> = {
  0: ["11", "26", "27"],           // 서울, 부산, 대구
  1: ["28", "29", "30", "31", "36"], // 인천, 광주, 대전, 울산, 세종
  2: ["41"],                        // 경기
  3: ["42", "43", "44", "45"],      // 강원, 충북, 충남, 전북
  4: ["46", "47", "48", "50"],      // 전남, 경북, 경남, 제주
};

/** 배치 번호에 해당하는 시/도 코드 목록 반환. 없으면 전체. */
function getSidoCodesForBatch(batch: number | null): string[] {
  if (batch !== null && BATCH_GROUPS[batch]) {
    return BATCH_GROUPS[batch];
  }
  // 배치 미지정 시 전체
  return Object.keys(REGION_HIERARCHY);
}

/** 시/도 코드 목록 → [regionCode, regionName] 튜플 배열 */
function getRegionEntries(sidoCodes: string[]): [string, string][] {
  const entries: [string, string][] = [];
  for (const sidoCode of sidoCodes) {
    const sido = REGION_HIERARCHY[sidoCode];
    if (!sido) continue;
    for (const [code, sigunguName] of Object.entries(sido.sigungu)) {
      entries.push([code, `${sido.shortName} ${sigunguName}`]);
    }
  }
  return entries;
}

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 쿼리 파라미터 파싱
  const { searchParams } = new URL(request.url);
  const batchParam = searchParams.get("batch");
  const batch = batchParam !== null ? parseInt(batchParam, 10) : null;
  const isCronBatch = batch !== null && !isNaN(batch);

  // property type 파라미터 (1=아파트(기본), 2=연립다세대, 3=오피스텔)
  const typeParam = searchParams.get("type");
  const propertyType: PropertyType = typeParam
    ? (parseInt(typeParam, 10) as PropertyType)
    : PROPERTY_TYPES.APT;

  // 비아파트 유형은 별도 핸들러로 분기
  if (propertyType !== PROPERTY_TYPES.APT) {
    return handleMultiPropertyType(request, propertyType, batch, isCronBatch);
  }

  const supabase = createServiceClient();
  const now = new Date();

  // cron 배치: 3개월, 수동 전체: 6개월
  const monthCount = isCronBatch ? 3 : 6;
  const dealYearMonths: string[] = [];
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dealYearMonths.push(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  let totalInserted = 0;
  let totalNewHigh = 0;
  let totalSignificantDrop = 0;
  const errors: string[] = [];

  // 배치별 지역 목록 구성
  const sidoCodes = getSidoCodesForBatch(isCronBatch ? batch : null);
  const regionEntries = getRegionEntries(sidoCodes);

  for (const dealYearMonth of dealYearMonths) {
    for (const [code, name] of regionEntries) {
      try {
        const transactions = await fetchTransactions(code, dealYearMonth);

        if (transactions.length === 0) {
          await delay(300);
          continue;
        }

        // 각 거래에 대해 최고가 조회 및 변동률 계산
        const enriched = await enrichTransactions(supabase, transactions, name);

        // DB 삽입 (중복 무시)
        const { data, error } = await supabase
          .from("apt_transactions")
          .upsert(
            enriched.map((t) => ({
              region_code: t.regionCode,
              region_name: `${name} ${t.dongName}`,
              apt_name: t.aptName,
              size_sqm: t.sizeSqm,
              floor: t.floor,
              trade_price: t.tradePrice,
              trade_date: t.tradeDate,
              highest_price: t.highestPrice,
              change_rate: t.changeRate,
              is_new_high: t.isNewHigh,
              is_significant_drop: t.isSignificantDrop,
              drop_level: t.dropLevel,
              deal_type: t.dealType,
              raw_data: t.rawData,
            })),
            { onConflict: "apt_name,size_sqm,floor,trade_date,trade_price", ignoreDuplicates: true }
          )
          .select("id");

        if (error) {
          errors.push(`${name}(${dealYearMonth}): ${error.message}`);
        } else {
          const insertCount = data?.length ?? 0;
          totalInserted += insertCount;
          totalNewHigh += enriched.filter((t) => t.isNewHigh).length;
          totalSignificantDrop += enriched.filter((t) => t.isSignificantDrop).length;
        }

        // 단지 마스터 UPSERT
        await upsertComplexes(supabase, transactions, name);

        await delay(300); // API 부하 방지
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${name}(${dealYearMonth}): ${msg}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    batch: isCronBatch ? batch : "all",
    sidoCodes,
    dealYearMonths,
    totalInserted,
    totalNewHigh,
    totalSignificantDrop,
    regionsProcessed: regionEntries.length,
    monthsProcessed: dealYearMonths.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

type DropLevel = "normal" | "decline" | "crash" | "severe";

function calcDropLevel(changeRate: number | null): DropLevel {
  if (changeRate === null) return "normal";
  if (changeRate <= -25) return "severe";
  if (changeRate <= -15) return "crash";
  if (changeRate <= -10) return "decline";
  return "normal";
}

interface EnrichedTransaction extends ParsedTransaction {
  highestPrice: number | null;
  changeRate: number | null;
  isNewHigh: boolean;
  isSignificantDrop: boolean;
  dropLevel: DropLevel;
}

async function enrichTransactions(
  supabase: ReturnType<typeof createServiceClient>,
  transactions: ParsedTransaction[],
  regionName: string
): Promise<EnrichedTransaction[]> {
  const enriched: EnrichedTransaction[] = [];
  if (transactions.length === 0) return enriched;

  // 최근 3년 기준일
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const threeYearsAgoStr = threeYearsAgo.toISOString().split("T")[0];

  // 해당 지역의 고유 단지명 목록
  const aptNames = [...new Set(transactions.map((t) => t.aptName))];

  // 1회 쿼리로 해당 지역의 모든 거래 이력 가져오기 (최근 3년)
  const { data: recentRows } = await supabase
    .from("apt_transactions")
    .select("apt_name,size_sqm,trade_price")
    .in("apt_name", aptNames)
    .gte("trade_date", threeYearsAgoStr)
    .order("trade_price", { ascending: false });

  // 1회 쿼리로 역대 최고가 가져오기 (fallback용)
  const { data: allTimeRows } = await supabase
    .from("apt_transactions")
    .select("apt_name,size_sqm,trade_price")
    .in("apt_name", aptNames)
    .order("trade_price", { ascending: false });

  // 메모리에서 단지+면적별 최고가 맵 구성
  const recentMaxMap = new Map<string, number>();
  for (const r of recentRows ?? []) {
    const key = `${r.apt_name}|${r.size_sqm}`;
    if (!recentMaxMap.has(key)) recentMaxMap.set(key, r.trade_price);
  }

  const allTimeMaxMap = new Map<string, number>();
  for (const r of allTimeRows ?? []) {
    const key = `${r.apt_name}|${r.size_sqm}`;
    if (!allTimeMaxMap.has(key)) allTimeMaxMap.set(key, r.trade_price);
  }

  for (const t of transactions) {
    const key = `${t.aptName}|${t.sizeSqm}`;
    let previousHighest = recentMaxMap.get(key) ?? 0;

    // 3년 내 거래 없으면 역대 최고가 fallback
    if (previousHighest === 0) {
      previousHighest = allTimeMaxMap.get(key) ?? 0;
    }

    const highestPrice = Math.max(previousHighest, t.tradePrice);
    const isNewHigh = t.tradePrice > previousHighest && previousHighest > 0;

    let changeRate: number | null = null;
    let isSignificantDrop = false;

    if (previousHighest > 0 && !isNewHigh) {
      changeRate = parseFloat(
        (((t.tradePrice - previousHighest) / previousHighest) * 100).toFixed(2)
      );
      isSignificantDrop = changeRate <= -15;
    }

    const dropLevel = calcDropLevel(changeRate);

    enriched.push({
      ...t,
      highestPrice,
      changeRate,
      isNewHigh,
      isSignificantDrop,
      dropLevel,
    });
  }

  return enriched;
}

async function upsertComplexes(
  supabase: ReturnType<typeof createServiceClient>,
  transactions: ParsedTransaction[],
  regionName: string
) {
  // 유니크한 단지 목록 추출
  const seen = new Set<string>();
  const complexes = [];

  for (const t of transactions) {
    const key = `${t.regionCode}-${t.aptName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const slug = `${t.regionCode}-${toSlug(t.aptName)}`;

    complexes.push({
      region_code: t.regionCode,
      region_name: regionName,
      dong_name: t.dongName,
      apt_name: t.aptName,
      built_year: t.builtYear || null,
      slug,
    });
  }

  if (complexes.length > 0) {
    await supabase
      .from("apt_complexes")
      .upsert(complexes, { onConflict: "slug", ignoreDuplicates: true });
  }
}

function toSlug(name: string): string {
  return name
    .replace(/[^가-힣a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// 멀티 부동산 유형 (연립다세대, 오피스텔 등) 핸들러
// ---------------------------------------------------------------------------

/** 비아파트 유형은 서울(11)만 처리 (batch 0 고정) */
const MULTI_TYPE_SIDO_CODES = ["11"];

async function handleMultiPropertyType(
  request: Request,
  propertyType: PropertyType,
  batch: number | null,
  isCronBatch: boolean
) {
  const supabase = createServiceClient();
  const now = new Date();
  const typeLabel = PROPERTY_TYPE_LABELS[propertyType] ?? `type-${propertyType}`;

  // 3개월치
  const monthCount = 3;
  const dealYearMonths: string[] = [];
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dealYearMonths.push(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const regionEntries = getRegionEntries(MULTI_TYPE_SIDO_CODES);

  let totalInserted = 0;
  let totalNewHigh = 0;
  let totalSignificantDrop = 0;
  const errors: string[] = [];

  for (const dealYearMonth of dealYearMonths) {
    for (const [code, name] of regionEntries) {
      try {
        const transactions = await fetchMultiTransactions(
          propertyType,
          code,
          dealYearMonth
        );

        if (transactions.length === 0) {
          await multiDelay(300);
          continue;
        }

        // 기존 enrichTransactions 와 호환되는 ParsedTransaction 으로 변환
        const asParsed: ParsedTransaction[] = transactions.map((t) => ({
          regionCode: t.regionCode,
          dongName: t.dongName,
          aptName: t.aptName,
          sizeSqm: t.sizeSqm,
          floor: t.floor,
          tradePrice: t.tradePrice,
          tradeDate: t.tradeDate,
          builtYear: t.builtYear,
          dealType: t.dealType,
          rawData: t.rawData as unknown as ParsedTransaction["rawData"],
        }));

        const enriched = await enrichTransactions(supabase, asParsed, name);

        const { data, error } = await supabase
          .from("apt_transactions")
          .upsert(
            enriched.map((t) => ({
              region_code: t.regionCode,
              region_name: `${name} ${t.dongName}`,
              apt_name: t.aptName,
              size_sqm: t.sizeSqm,
              floor: t.floor,
              trade_price: t.tradePrice,
              trade_date: t.tradeDate,
              highest_price: t.highestPrice,
              change_rate: t.changeRate,
              is_new_high: t.isNewHigh,
              is_significant_drop: t.isSignificantDrop,
              drop_level: t.dropLevel,
              deal_type: t.dealType,
              raw_data: t.rawData,
              property_type: propertyType,
            })),
            {
              onConflict: "apt_name,size_sqm,floor,trade_date,trade_price",
              ignoreDuplicates: true,
            }
          )
          .select("id");

        if (error) {
          errors.push(`${name}(${dealYearMonth}): ${error.message}`);
        } else {
          const insertCount = data?.length ?? 0;
          totalInserted += insertCount;
          totalNewHigh += enriched.filter((t) => t.isNewHigh).length;
          totalSignificantDrop += enriched.filter(
            (t) => t.isSignificantDrop
          ).length;
        }

        // 단지 마스터 UPSERT
        await upsertComplexes(supabase, asParsed, name);

        await multiDelay(300);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${name}(${dealYearMonth}): ${msg}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    propertyType,
    propertyTypeLabel: typeLabel,
    batch: isCronBatch ? batch : "all",
    sidoCodes: MULTI_TYPE_SIDO_CODES,
    dealYearMonths,
    totalInserted,
    totalNewHigh,
    totalSignificantDrop,
    regionsProcessed: regionEntries.length,
    monthsProcessed: dealYearMonths.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
