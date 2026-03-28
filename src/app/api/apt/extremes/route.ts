import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "drop"; // drop | high
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  try {
    if (type === "high") {
      // 신고가 갱신 거래
      const data = await db
        .select({
          id: aptTransactions.id,
          region_code: aptTransactions.regionCode,
          region_name: aptTransactions.regionName,
          apt_name: aptTransactions.aptName,
          size_sqm: aptTransactions.sizeSqm,
          floor: aptTransactions.floor,
          trade_price: aptTransactions.tradePrice,
          trade_date: aptTransactions.tradeDate,
          highest_price: aptTransactions.highestPrice,
          change_rate: aptTransactions.changeRate,
          is_new_high: aptTransactions.isNewHigh,
          is_significant_drop: aptTransactions.isSignificantDrop,
          deal_type: aptTransactions.dealType,
          drop_level: aptTransactions.dropLevel,
        })
        .from(aptTransactions)
        .where(eq(aptTransactions.isNewHigh, true))
        .orderBy(desc(aptTransactions.tradeDate))
        .limit(limit);

      return NextResponse.json({ type: "high", data });
    }

    // 폭락 거래 (하락률 순)
    const data = await db
      .select({
        id: aptTransactions.id,
        region_code: aptTransactions.regionCode,
        region_name: aptTransactions.regionName,
        apt_name: aptTransactions.aptName,
        size_sqm: aptTransactions.sizeSqm,
        floor: aptTransactions.floor,
        trade_price: aptTransactions.tradePrice,
        trade_date: aptTransactions.tradeDate,
        highest_price: aptTransactions.highestPrice,
        change_rate: aptTransactions.changeRate,
        is_new_high: aptTransactions.isNewHigh,
        is_significant_drop: aptTransactions.isSignificantDrop,
        deal_type: aptTransactions.dealType,
        drop_level: aptTransactions.dropLevel,
      })
      .from(aptTransactions)
      .where(eq(aptTransactions.isSignificantDrop, true))
      .orderBy(asc(aptTransactions.changeRate))
      .limit(limit);

    return NextResponse.json({ type: "drop", data });
  } catch (e) {
    logger.error("Failed to fetch extremes", { error: e, route: "/api/apt/extremes" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
