import { unstable_cache } from "next/cache";
import { desc, inArray, sql } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import type { MonthlyVolume } from "@/lib/market-trend-landing";

export type TrendSidoAvgPrice = {
  name: string;
  slug: string;
  avgPrice: number;
  count: number;
};

async function fetchTrendMonthlyVolume(): Promise<MonthlyVolume[]> {
  const monthExpression = sql<string>`substring(${aptTransactions.tradeDate}, 1, 7)`;
  const rows = await db
    .select({
      month: monthExpression,
      count: sql<number>`count(*)`,
    })
    .from(aptTransactions)
    .groupBy(monthExpression)
    .orderBy(desc(monthExpression))
    .limit(6);

  return rows
    .map((row) => ({
      month: row.month,
      count: Number(row.count),
    }))
    .reverse();
}

async function fetchTrendSidoAvgPrices(): Promise<TrendSidoAvgPrice[]> {
  return Promise.all(
    Object.values(REGION_HIERARCHY).map(async (sido) => {
      const sigunguCodes = Object.keys(sido.sigungu);

      const rows = await db.select({
        trade_price: aptTransactions.tradePrice,
      }).from(aptTransactions)
        .where(inArray(aptTransactions.regionCode, sigunguCodes))
        .orderBy(desc(aptTransactions.tradeDate))
        .limit(1000);

      const prices = rows.map((d) => Number(d.trade_price ?? 0));
      const avgPrice =
        prices.length > 0
          ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
          : 0;

      return {
        name: sido.shortName,
        slug: sido.slug,
        avgPrice,
        count: prices.length,
      };
    })
  );
}

export const getCachedTrendMonthlyVolume = unstable_cache(
  fetchTrendMonthlyVolume,
  ["trend-monthly-volume-v1"],
  {
    revalidate: 3600,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  },
);

export const getCachedTrendSidoAvgPrices = unstable_cache(
  fetchTrendSidoAvgPrices,
  ["trend-sido-avg-prices-v1"],
  {
    revalidate: 3600,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  },
);
