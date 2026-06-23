import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { getSidoBySlug } from "@/lib/constants/region-codes";
import {
  createMarketStatsCutoffDate,
  getMarketSidoEntries,
  type MarketSigunguStat,
  type MarketSigunguTransaction,
  type MarketSigunguTransactions,
  type MarketSidoStat,
} from "@/lib/market-dashboard-data";
import { computeMedianPrice, isDirectDeal } from "@/lib/price-normalization";

type MarketSigunguTransactionRow = Omit<
  MarketSigunguTransaction,
  "size_sqm" | "trade_price"
> & {
  size_sqm: number | string;
  trade_price: number | string;
};

type PriceRow = { trade_price: number | string; deal_type: string | null };

function propertyTypeFilter(propertyType: number) {
  return propertyType !== 0
    ? eq(aptTransactions.propertyType, propertyType)
    : undefined;
}

const MARKET_STATS_CONCURRENCY = 2;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function normalizeMarketTransactionRows(
  rows: MarketSigunguTransactionRow[]
): MarketSigunguTransaction[] {
  return rows.map((row) => ({
    ...row,
    trade_price: Number(row.trade_price),
    size_sqm: Number(row.size_sqm),
  }));
}

async function fetchMarketSidoStats(propertyType: number): Promise<MarketSidoStat[]> {
  const cutoff = createMarketStatsCutoffDate();
  const typeFilter = propertyTypeFilter(propertyType);

  return mapWithConcurrency(
    getMarketSidoEntries(),
    MARKET_STATS_CONCURRENCY,
    async ([sidoCode, sido]) => {
      const sigunguCodes = Object.keys(sido.sigungu);

      const [countResult, dropResult, highResult, priceResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(aptTransactions)
          .where(and(
            inArray(aptTransactions.regionCode, sigunguCodes),
            gte(aptTransactions.tradeDate, cutoff),
            typeFilter,
          )),
        db.select({
          apt_name: aptTransactions.aptName,
          change_rate: aptTransactions.changeRate,
          trade_price: aptTransactions.tradePrice,
        }).from(aptTransactions)
          .where(and(
            inArray(aptTransactions.regionCode, sigunguCodes),
            gte(aptTransactions.tradeDate, cutoff),
            isNotNull(aptTransactions.changeRate),
            lt(aptTransactions.changeRate, "0"),
            typeFilter,
          ))
          .orderBy(asc(aptTransactions.changeRate))
          .limit(1),
        db.select({
          apt_name: aptTransactions.aptName,
          trade_price: aptTransactions.tradePrice,
        }).from(aptTransactions)
          .where(and(
            inArray(aptTransactions.regionCode, sigunguCodes),
            gte(aptTransactions.tradeDate, cutoff),
            eq(aptTransactions.isNewHigh, true),
            typeFilter,
          ))
          .orderBy(desc(aptTransactions.tradeDate))
          .limit(1),
        db.select({
          trade_price: aptTransactions.tradePrice,
          deal_type: aptTransactions.dealType,
        }).from(aptTransactions)
          .where(and(
            inArray(aptTransactions.regionCode, sigunguCodes),
            gte(aptTransactions.tradeDate, cutoff),
            typeFilter,
          )),
      ]);

      const validPrices = priceResult
        .filter((t) => !isDirectDeal(t.deal_type))
        .map((t) => Number(t.trade_price));
      const medianPrice = computeMedianPrice(validPrices);
      const avgPrice = validPrices.length
        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
        : 0;
      const topDropRaw = dropResult[0] ?? null;
      const topHighRaw = highResult[0] ?? null;

      return {
        code: sidoCode,
        name: sido.name,
        shortName: sido.shortName,
        slug: sido.slug,
        sigunguCount: sigunguCodes.length,
        count: Number(countResult[0]?.count ?? 0),
        topDrop: topDropRaw ? {
          apt_name: topDropRaw.apt_name,
          change_rate: Number(topDropRaw.change_rate),
          trade_price: Number(topDropRaw.trade_price),
        } : null,
        topHigh: topHighRaw ? {
          apt_name: topHighRaw.apt_name,
          trade_price: Number(topHighRaw.trade_price),
        } : null,
        medianPrice,
        avgPrice,
      };
    },
  );
}

async function fetchMarketSigunguStats(sidoSlug: string): Promise<MarketSigunguStat[]> {
  const sido = getSidoBySlug(sidoSlug);
  if (!sido) return [];

  const cutoff = createMarketStatsCutoffDate();

  return mapWithConcurrency(
    Object.entries(sido.sigungu),
    MARKET_STATS_CONCURRENCY,
    async ([code, name]) => {
      const [countResult, dropResult, highResult, priceResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(aptTransactions)
          .where(and(
            eq(aptTransactions.regionCode, code),
            gte(aptTransactions.tradeDate, cutoff),
            eq(aptTransactions.propertyType, 1),
          )),
        db.select({
          apt_name: aptTransactions.aptName,
          change_rate: aptTransactions.changeRate,
          trade_price: aptTransactions.tradePrice,
        }).from(aptTransactions)
          .where(and(
            eq(aptTransactions.regionCode, code),
            gte(aptTransactions.tradeDate, cutoff),
            isNotNull(aptTransactions.changeRate),
            lt(aptTransactions.changeRate, "0"),
            eq(aptTransactions.propertyType, 1),
          ))
          .orderBy(asc(aptTransactions.changeRate))
          .limit(1),
        db.select({
          apt_name: aptTransactions.aptName,
          trade_price: aptTransactions.tradePrice,
        }).from(aptTransactions)
          .where(and(
            eq(aptTransactions.regionCode, code),
            gte(aptTransactions.tradeDate, cutoff),
            eq(aptTransactions.isNewHigh, true),
            eq(aptTransactions.propertyType, 1),
          ))
          .orderBy(desc(aptTransactions.tradeDate))
          .limit(1),
        db.select({
          trade_price: aptTransactions.tradePrice,
          deal_type: aptTransactions.dealType,
        }).from(aptTransactions)
          .where(and(
            eq(aptTransactions.regionCode, code),
            gte(aptTransactions.tradeDate, cutoff),
            eq(aptTransactions.propertyType, 1),
          )),
      ]);

      const validPrices = (priceResult as PriceRow[])
        .filter((t) => !isDirectDeal(t.deal_type))
        .map((t) => Number(t.trade_price));
      const medianPrice = computeMedianPrice(validPrices);
      const avgPrice = validPrices.length
        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
        : 0;
      const topDropRaw = dropResult[0] ?? null;
      const topHighRaw = highResult[0] ?? null;

      return {
        code,
        name,
        count: Number(countResult[0]?.count ?? 0),
        topDrop: topDropRaw ? {
          apt_name: topDropRaw.apt_name,
          change_rate: Number(topDropRaw.change_rate),
          trade_price: Number(topDropRaw.trade_price),
        } : null,
        topHigh: topHighRaw ? {
          apt_name: topHighRaw.apt_name,
          trade_price: Number(topHighRaw.trade_price),
        } : null,
        medianPrice,
        avgPrice,
      };
    }
  );
}

async function fetchMarketSigunguTransactions(
  regionCode: string,
  propertyType: number
): Promise<MarketSigunguTransactions> {
  const cutoff = createMarketStatsCutoffDate();
  const typeFilter = propertyTypeFilter(propertyType);
  const txFields = {
    id: aptTransactions.id,
    region_code: aptTransactions.regionCode,
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
  };

  const [dropsResult, highsResult, recentResult, countResult] = await Promise.all([
    db.select(txFields).from(aptTransactions)
      .where(and(
        eq(aptTransactions.regionCode, regionCode),
        gte(aptTransactions.tradeDate, cutoff),
        isNotNull(aptTransactions.changeRate),
        lt(aptTransactions.changeRate, "0"),
        typeFilter,
      ))
      .orderBy(asc(aptTransactions.changeRate))
      .limit(10),
    db.select(txFields).from(aptTransactions)
      .where(and(
        eq(aptTransactions.regionCode, regionCode),
        gte(aptTransactions.tradeDate, cutoff),
        eq(aptTransactions.isNewHigh, true),
        typeFilter,
      ))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(10),
    db.select(txFields).from(aptTransactions)
      .where(and(
        eq(aptTransactions.regionCode, regionCode),
        gte(aptTransactions.tradeDate, cutoff),
        typeFilter,
      ))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(20),
    db.select({ count: sql<number>`count(*)` }).from(aptTransactions)
      .where(and(
        eq(aptTransactions.regionCode, regionCode),
        gte(aptTransactions.tradeDate, cutoff),
        typeFilter,
      )),
  ]);

  return {
    drops: normalizeMarketTransactionRows(dropsResult as MarketSigunguTransactionRow[]),
    highs: normalizeMarketTransactionRows(highsResult as MarketSigunguTransactionRow[]),
    recent: normalizeMarketTransactionRows(recentResult as MarketSigunguTransactionRow[]),
    totalCount: Number(countResult[0]?.count ?? 0),
  };
}

export const getCachedMarketSidoStats = unstable_cache(
  fetchMarketSidoStats,
  ["market-sido-stats-v2"],
  {
    revalidate: 3600,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  },
);

export const getCachedMarketSigunguStats = unstable_cache(
  fetchMarketSigunguStats,
  ["market-sigungu-stats-v2"],
  {
    revalidate: 3600,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  },
);

export const getCachedMarketSigunguTransactions = unstable_cache(
  fetchMarketSigunguTransactions,
  ["market-sigungu-transactions-v2"],
  {
    revalidate: 1800,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  },
);
