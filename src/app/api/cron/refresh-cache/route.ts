import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptTransactions, aptComplexes, financeRates, homepageCache } from "@/lib/db/schema";
import { and, isNotNull, lt, desc, eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 60;

const txFields = {
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
  property_type: aptTransactions.propertyType,
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Run all heavy queries in parallel
    const [dropsRows, highsRows, volumeRows, recentRows, ratesRows, txnCountRows, complexCountRows] =
      await Promise.all([
        // Top drops (biggest negative change_rate)
        db
          .select(txFields)
          .from(aptTransactions)
          .where(and(isNotNull(aptTransactions.changeRate), lt(aptTransactions.changeRate, "0")))
          .orderBy(aptTransactions.changeRate)
          .limit(30),
        // New highs
        db
          .select(txFields)
          .from(aptTransactions)
          .where(eq(aptTransactions.isNewHigh, true))
          .orderBy(desc(aptTransactions.tradeDate))
          .limit(30),
        // Volume (recent + high price)
        db
          .select(txFields)
          .from(aptTransactions)
          .orderBy(desc(aptTransactions.tradeDate), desc(aptTransactions.tradePrice))
          .limit(30),
        // Most recent
        db
          .select(txFields)
          .from(aptTransactions)
          .orderBy(desc(aptTransactions.tradeDate))
          .limit(30),
        // Finance rates
        db
          .select({
            rate_type: financeRates.rateType,
            rate_value: financeRates.rateValue,
            prev_value: financeRates.prevValue,
            change_bp: financeRates.changeBp,
            base_date: financeRates.baseDate,
            source: financeRates.source,
          })
          .from(financeRates)
          .orderBy(desc(financeRates.baseDate))
          .limit(5),
        // Total transaction count
        db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
        // Total complex count
        db.select({ count: sql<number>`count(*)` }).from(aptComplexes),
      ]);

    const totalTransactions = Number(txnCountRows[0]?.count ?? 0);
    const totalComplexes = Number(complexCountRows[0]?.count ?? 0);

    const cacheData = {
      drops: JSON.stringify(dropsRows),
      highs: JSON.stringify(highsRows),
      volume: JSON.stringify(volumeRows),
      recent: JSON.stringify(recentRows),
      rates: JSON.stringify(ratesRows),
      total_transactions: totalTransactions,
      total_complexes: totalComplexes,
    };

    // Upsert into homepage_cache (id=1)
    await db
      .insert(homepageCache)
      .values({
        id: 1,
        drops: JSON.parse(cacheData.drops),
        highs: JSON.parse(cacheData.highs),
        volume: JSON.parse(cacheData.volume),
        recent: JSON.parse(cacheData.recent),
        rates: JSON.parse(cacheData.rates),
        totalTransactions: cacheData.total_transactions,
        totalComplexes: cacheData.total_complexes,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: homepageCache.id,
        set: {
          drops: JSON.parse(cacheData.drops),
          highs: JSON.parse(cacheData.highs),
          volume: JSON.parse(cacheData.volume),
          recent: JSON.parse(cacheData.recent),
          rates: JSON.parse(cacheData.rates),
          totalTransactions: cacheData.total_transactions,
          totalComplexes: cacheData.total_complexes,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      ok: true,
      total_transactions: totalTransactions,
      total_complexes: totalComplexes,
      drops: dropsRows.length,
      highs: highsRows.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Refresh-cache failed", { error, cron: "refresh-cache" });
    await sendSlackAlert(`[refresh-cache] 실패: ${msg}`);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
