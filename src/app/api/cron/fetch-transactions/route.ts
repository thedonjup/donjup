import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchTransactions, delay } from "@/lib/api/molit";
import { SEOUL_REGION_CODES } from "@/lib/constants/region-codes";
import type { ParsedTransaction } from "@/lib/api/molit";

export const maxDuration = 300; // 5분 (Vercel Pro)

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // 이번달 + 이전 1개월 (총 2개월) 수집 — 실거래가 데이터는 1~2개월 지연 공개
  const dealYearMonths: string[] = [];
  for (let i = 0; i < 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dealYearMonths.push(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  let totalInserted = 0;
  let totalNewHigh = 0;
  let totalSignificantDrop = 0;
  const errors: string[] = [];

  // 서울 25개구 × 2개월 순차 호출
  const regionEntries = Object.entries(SEOUL_REGION_CODES);

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
    dealYearMonths,
    totalInserted,
    totalNewHigh,
    totalSignificantDrop,
    regionsProcessed: regionEntries.length,
    monthsProcessed: dealYearMonths.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

interface EnrichedTransaction extends ParsedTransaction {
  highestPrice: number | null;
  changeRate: number | null;
  isNewHigh: boolean;
  isSignificantDrop: boolean;
}

async function enrichTransactions(
  supabase: ReturnType<typeof createServiceClient>,
  transactions: ParsedTransaction[],
  regionName: string
): Promise<EnrichedTransaction[]> {
  const enriched: EnrichedTransaction[] = [];

  for (const t of transactions) {
    // 해당 단지+면적의 역대 최고가 조회
    const { data: maxRow } = await supabase
      .from("apt_transactions")
      .select("trade_price")
      .eq("apt_name", t.aptName)
      .eq("size_sqm", t.sizeSqm)
      .order("trade_price", { ascending: false })
      .limit(1)
      .single();

    const previousHighest = maxRow?.trade_price ?? 0;
    const highestPrice = Math.max(previousHighest, t.tradePrice);
    const isNewHigh = t.tradePrice > previousHighest && previousHighest > 0;

    let changeRate: number | null = null;
    let isSignificantDrop = false;

    if (previousHighest > 0 && !isNewHigh) {
      changeRate = parseFloat(
        (((t.tradePrice - previousHighest) / previousHighest) * 100).toFixed(2)
      );
      isSignificantDrop = changeRate <= -20;
    }

    enriched.push({
      ...t,
      highestPrice,
      changeRate,
      isNewHigh,
      isSignificantDrop,
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
