import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  fetchAllMortgageProducts,
  bankNameToRateType,
  type MortgageProduct,
} from "@/lib/api/finlife";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

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
      const prevRows = await db
        .select({ rate_value: financeRates.rateValue })
        .from(financeRates)
        .where(eq(financeRates.rateType, bank.rateType))
        .orderBy(desc(financeRates.baseDate))
        .limit(1);

      const prevValue = prevRows[0] ? Number(prevRows[0].rate_value) : null;
      const changeBp =
        prevValue !== null
          ? Math.round((bank.minRate - prevValue) * 100)
          : null;

      try {
        await db.insert(financeRates).values({
          rateType: bank.rateType,
          rateValue: String(bank.minRate),
          prevValue: prevValue !== null ? String(prevValue) : null,
          changeBp,
          baseDate,
          source: "FINLIFE",
        })
        .onConflictDoUpdate({
          target: [financeRates.rateType, financeRates.baseDate],
          set: {
            rateValue: String(bank.minRate),
            prevValue: prevValue !== null ? String(prevValue) : null,
            changeBp,
          },
        });
        inserted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${bank.rateType}: ${msg}`);
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

    try {
      await db.insert(financeRates).values({
        rateType: "BANK_PRODUCTS_ALL",
        rateValue: "0",
        baseDate,
        source: "FINLIFE",
        // change_bp에 상품 수를 기록
        changeBp: allProductsData.length,
      })
      .onConflictDoUpdate({
        target: [financeRates.rateType, financeRates.baseDate],
        set: {
          changeBp: allProductsData.length,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`BANK_PRODUCTS_ALL: ${msg}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
  }

  if (errors.length > 0) {
    logger.error("Fetch-bank-rates had errors", { errorCount: errors.length, cron: "fetch-bank-rates" });
    await sendSlackAlert(`[fetch-bank-rates] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
