/**
 * 군집 지수 계산 엔진
 *
 * 지역 코드 배열을 받아 월별 중위가 지수(기준시점=100)를 반환한다.
 */

import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { getSigunguName } from "@/lib/constants/region-codes";
import { computeMedianPrice, groupByMonth, isDirectDeal } from "@/lib/price-normalization";

export interface ClusterIndexPoint {
  month: string;
  index: number;
  medianPrice: number;
  count: number;
}

export interface ClusterPerRegionMedian {
  regionCode: string;
  name: string;
  medianPrice: number;
  count: number;
}

export async function computeClusterIndex(
  regionCodes: string[],
  minTransactions = 3
): Promise<ClusterIndexPoint[]> {
  if (regionCodes.length === 0) return [];

  const rows = await db
    .select({
      trade_date: aptTransactions.tradeDate,
      trade_price: aptTransactions.tradePrice,
      floor: aptTransactions.floor,
      deal_type: aptTransactions.dealType,
    })
    .from(aptTransactions)
    .where(
      and(
        inArray(aptTransactions.regionCode, regionCodes),
        eq(aptTransactions.propertyType, 1)
      )
    )
    .orderBy(asc(aptTransactions.tradeDate));

  type Row = {
    trade_date: string;
    trade_price: number | string;
    floor: number | string | null;
    deal_type: string | null;
  };

  const typedRows = rows as Row[];

  // Filter out direct deals for cluster-level index computation
  const filtered = typedRows
    .filter((r) => !isDirectDeal(r.deal_type))
    .map((r) => ({
      trade_date: typeof r.trade_date === "string" ? r.trade_date.slice(0, 10) : String(r.trade_date),
      trade_price: Number(r.trade_price),
    }));

  const monthly = groupByMonth(filtered);

  // Find base month: first month with enough transactions
  const baseMonthEntry = monthly.find((m) => m.prices.length >= minTransactions);
  if (!baseMonthEntry) return [];

  const baseMedian = computeMedianPrice(baseMonthEntry.prices);
  if (baseMedian === 0) return [];

  const points: ClusterIndexPoint[] = [];

  for (const entry of monthly) {
    if (entry.prices.length < minTransactions) continue;
    const median = computeMedianPrice(entry.prices);
    const index = Math.round((median / baseMedian) * 1000) / 10;
    points.push({
      month: entry.month,
      index,
      medianPrice: median,
      count: entry.prices.length,
    });
  }

  return points;
}

export const getCachedClusterIndex = unstable_cache(
  computeClusterIndex,
  ["cluster-index-v1"],
  {
    revalidate: 3600,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  }
);

export async function getClusterPerRegionMedian(
  regionCodes: string[]
): Promise<ClusterPerRegionMedian[]> {
  if (regionCodes.length === 0) return [];

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const dateStr = threeMonthsAgo.toISOString().slice(0, 10);

  const rows = await db
    .select({
      region_code: aptTransactions.regionCode,
      trade_price: aptTransactions.tradePrice,
      deal_type: aptTransactions.dealType,
    })
    .from(aptTransactions)
    .where(
      and(
        gte(aptTransactions.tradeDate, dateStr),
        inArray(aptTransactions.regionCode, regionCodes),
        eq(aptTransactions.propertyType, 1)
      )
    )
    .orderBy(desc(aptTransactions.tradeDate));

  const byCode = new Map<string, number[]>();
  for (const row of rows) {
    if (isDirectDeal(row.deal_type)) continue;

    const existing = byCode.get(row.region_code);
    const price = Number(row.trade_price);
    if (existing) {
      existing.push(price);
    } else {
      byCode.set(row.region_code, [price]);
    }
  }

  return regionCodes.map((code) => {
    const prices = byCode.get(code) ?? [];
    return {
      regionCode: code,
      name: getSigunguName(code) ?? code,
      medianPrice: computeMedianPrice(prices),
      count: prices.length,
    };
  });
}

export const getCachedClusterPerRegionMedian = unstable_cache(
  getClusterPerRegionMedian,
  ["cluster-per-region-median-v1"],
  {
    revalidate: 3600,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  }
);
