import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { ne, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * 은행별 주담대 최저금리 조회 API
 * GET /api/bank-rates
 */
export async function GET() {
  try {
    const data = await db
      .select({
        rate_type: financeRates.rateType,
        rate_value: financeRates.rateValue,
        base_date: financeRates.baseDate,
      })
      .from(financeRates)
      .where(ne(financeRates.rateType, "BANK_PRODUCTS_ALL"))
      .orderBy(desc(financeRates.baseDate))
      .limit(50);

    // Filter BANK_% client-side (Drizzle doesn't support SQL LIKE with AND NOT easily combined)
    const bankRows = data.filter((r) => r.rate_type.startsWith("BANK_"));

    // 은행별 최신 값만 추출
    const latestByBank = new Map<string, { rate_type: string; rate_value: string | number; base_date: string }>();
    for (const row of bankRows) {
      if (!latestByBank.has(row.rate_type)) {
        latestByBank.set(row.rate_type, row);
      }
    }

    const rates = Array.from(latestByBank.values());
    const minRate = rates.length > 0
      ? Math.min(...rates.map((r) => Number(r.rate_value)))
      : null;

    return NextResponse.json({ rates, minRate });
  } catch (e) {
    logger.error("Failed to fetch bank rates", { error: e, route: "/api/bank-rates" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
