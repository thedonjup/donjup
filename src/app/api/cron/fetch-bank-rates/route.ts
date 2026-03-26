import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import {
  fetchAllMortgageProducts,
  bankNameToRateType,
  type MortgageProduct,
} from "@/lib/api/finlife";

export const maxDuration = 60;

/**
 * 금융감독원 FinLife API에서 은행별 주택담보대출 금리를 수집하는 크론
 * 주간 실행 (매주 월요일 10:00 UTC)
 */
export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const errors: string[] = [];
  let inserted = 0;

  try {
    const products = await fetchAllMortgageProducts();

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        errors: ["FinLife API에서 상품 데이터를 가져오지 못했습니다."],
      });
    }

    // 은행별 최저금리 기준으로 그룹핑 (같은 은행의 여러 상품 중 최저)
    const bankBest = new Map<
      string,
      { rateType: string; minRate: number; maxRate: number; product: MortgageProduct }
    >();

    for (const p of products) {
      const rateType = bankNameToRateType(p.bankName);
      const existing = bankBest.get(rateType);

      if (!existing || p.rateMin < existing.minRate) {
        bankBest.set(rateType, {
          rateType,
          minRate: p.rateMin,
          maxRate: p.rateMax,
          product: p,
        });
      }
    }

    const baseDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const [, bank] of bankBest) {
      // 이전 값 조회 (변동폭 계산)
      const { data: prevRow } = await supabase
        .from("finance_rates")
        .select("rate_value")
        .eq("rate_type", bank.rateType)
        .lt("base_date", baseDate)
        .order("base_date", { ascending: false })
        .limit(1)
        .single();

      const prevValue = prevRow?.rate_value ?? null;
      const changeBp =
        prevValue !== null
          ? Math.round((bank.minRate - prevValue) * 100)
          : null;

      const { error } = await supabase.from("finance_rates").upsert(
        {
          rate_type: bank.rateType,
          rate_value: bank.minRate,
          prev_value: prevValue,
          change_bp: changeBp,
          base_date: baseDate,
          source: "FINLIFE",
        },
        { onConflict: "rate_type,base_date" }
      );

      if (error) {
        errors.push(`${bank.rateType}: ${error.message}`);
      } else {
        inserted++;
      }
    }

    // 전체 상품 데이터도 별도로 저장 (상세 표시용, JSON으로)
    const allProductsData = products.map((p) => ({
      bank_name: p.bankName,
      product_name: p.productName,
      rate_type_name: p.rateType,
      rate_min: p.rateMin,
      rate_max: p.rateMax,
      rate_avg: p.rateAvg,
    }));

    const { error: metaError } = await supabase.from("finance_rates").upsert(
      {
        rate_type: "BANK_PRODUCTS_ALL",
        rate_value: 0,
        base_date: baseDate,
        source: "FINLIFE",
        // raw_data 컬럼이 없으므로, change_bp에 상품 수를 기록
        change_bp: allProductsData.length,
      },
      { onConflict: "rate_type,base_date" }
    );

    if (metaError) {
      errors.push(`BANK_PRODUCTS_ALL: ${metaError.message}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
  }

  return NextResponse.json({
    success: errors.length === 0,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
