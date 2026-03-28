import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { eq, gte, asc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rateType = searchParams.get("type"); // BASE_RATE, CD_91 등
  const months = parseInt(searchParams.get("months") ?? "12", 10);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  try {
    const query = db
      .select({
        rate_type: financeRates.rateType,
        rate_value: financeRates.rateValue,
        change_bp: financeRates.changeBp,
        base_date: financeRates.baseDate,
      })
      .from(financeRates)
      .where(
        rateType
          ? eq(financeRates.rateType, rateType)
          : gte(financeRates.baseDate, startDate.toISOString().split("T")[0])
      )
      .orderBy(asc(financeRates.baseDate))
      .limit(500);

    const rates = await query;

    return NextResponse.json({ data: rates });
  } catch (e) {
    logger.error("Failed to fetch rate history", { error: e, route: "/api/rate/history" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
