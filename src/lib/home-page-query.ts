import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { pageviewStartDate } from "@/lib/analytics-popular";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { calcDropLevel } from "@/lib/constants/drop-level";
import { db } from "@/lib/db";
import {
  aptComplexes,
  aptTransactions,
  financeRates,
  homepageCache,
  pageViews,
} from "@/lib/db/schema";
import {
  adjustFloorPrice,
  isDirectDeal,
  LOW_FLOOR_MAX,
} from "@/lib/price-normalization";

export type HomeTransaction = {
  id: string;
  region_code: string;
  region_name?: string;
  apt_name: string;
  size_sqm: number;
  floor: number | null;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  deal_type: string | null;
  drop_level: string;
  property_type: number;
  complex_slug: string | null;
  govt_complex_id: string | null;
};

export type HomeFinanceRate = {
  rate_type: string;
  rate_value: number;
  prev_value: number | null;
  change_bp: number | null;
  base_date: string;
  source: string;
};

export type HomePopularItem = {
  page_path: string;
  page_type: string | null;
  view_count: number;
};

export type HomePageData = {
  drops: HomeTransaction[];
  highs: HomeTransaction[];
  volume: HomeTransaction[];
  recent: HomeTransaction[];
  rates: HomeFinanceRate[];
  totalTxns: number;
  totalComplexes: number;
  popularItems: HomePopularItem[];
};

type HomeTransactionRow = Omit<
  HomeTransaction,
  "size_sqm" | "trade_price" | "change_rate"
> & {
  size_sqm: number | string;
  trade_price: number | string;
  change_rate: number | string | null;
};

function filterByType<T extends { property_type: number }>(
  rows: T[],
  validType: number
): T[] {
  if (validType === 0) return rows;
  return rows.filter((row) => row.property_type === validType);
}

function parseCachedArray<T>(value: unknown): T[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed as T[] : [];
}

function normalizeHomeTransactions(rows: unknown): HomeTransaction[] {
  return parseCachedArray<HomeTransactionRow>(rows).map((row) => ({
    ...row,
    size_sqm: Number(row.size_sqm),
    trade_price: Number(row.trade_price),
    change_rate: row.change_rate === null ? null : Number(row.change_rate),
  }));
}

function normalizeFinanceRates(rows: unknown): HomeFinanceRate[] {
  return parseCachedArray<HomeFinanceRate>(rows).map((row) => ({
    ...row,
    rate_value: Number(row.rate_value),
  }));
}

function applyRankingNormalization(txns: HomeTransaction[]): HomeTransaction[] {
  return txns
    .filter((transaction) => {
      if (
        isDirectDeal(transaction.deal_type) &&
        transaction.highest_price !== null &&
        transaction.highest_price > 0 &&
        transaction.trade_price < transaction.highest_price * 0.70
      ) {
        return false;
      }
      return true;
    })
    .map((transaction) => {
      if (
        transaction.floor !== null &&
        transaction.floor > 0 &&
        transaction.floor <= LOW_FLOOR_MAX &&
        transaction.highest_price !== null &&
        transaction.highest_price > 0
      ) {
        const adjustedPrice = adjustFloorPrice(transaction.trade_price, transaction.floor);
        const changeRate = Number(
          (((adjustedPrice - transaction.highest_price) / transaction.highest_price) * 100)
            .toFixed(2)
        );
        return {
          ...transaction,
          change_rate: changeRate,
          drop_level: calcDropLevel(changeRate),
        };
      }
      return transaction;
    });
}

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
  complex_slug: aptComplexes.slug,
  govt_complex_id: aptComplexes.govtComplexId,
};

function typeFilter(validType: number) {
  return validType !== 0
    ? eq(aptTransactions.propertyType, validType)
    : undefined;
}

async function fetchHomepageCacheData(validType: number): Promise<Omit<HomePageData, "popularItems">> {
  const cacheRows = await db
    .select({
      drops: homepageCache.drops,
      highs: homepageCache.highs,
      volume: homepageCache.volume,
      recent: homepageCache.recent,
      rates: homepageCache.rates,
      totalTransactions: homepageCache.totalTransactions,
      totalComplexes: homepageCache.totalComplexes,
    })
    .from(homepageCache)
    .where(eq(homepageCache.id, 1))
    .limit(1);

  const cache = cacheRows[0] ?? null;
  if (!cache?.drops) {
    return fetchHomepageFallbackData(validType);
  }

  const drops = applyRankingNormalization(normalizeHomeTransactions(cache.drops))
    .sort((a, b) => (a.change_rate ?? 0) - (b.change_rate ?? 0));
  const highs = applyRankingNormalization(normalizeHomeTransactions(cache.highs));

  return {
    drops: filterByType(drops, validType).slice(0, 10),
    highs: filterByType(highs, validType).slice(0, 10),
    volume: filterByType(normalizeHomeTransactions(cache.volume), validType).slice(0, 10),
    recent: filterByType(normalizeHomeTransactions(cache.recent), validType).slice(0, 10),
    rates: normalizeFinanceRates(cache.rates),
    totalTxns: Number(cache.totalTransactions) || 0,
    totalComplexes: Number(cache.totalComplexes) || 0,
  };
}

async function fetchHomepageFallbackData(
  validType: number
): Promise<Omit<HomePageData, "popularItems">> {
  const filter = typeFilter(validType);
  const [
    dropsRes,
    highsRes,
    volumeRes,
    recentRes,
    ratesRes,
    txnCount,
    complexCount,
  ] = await Promise.allSettled([
    db.select(txFields).from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .where(and(isNotNull(aptTransactions.changeRate), lt(aptTransactions.changeRate, "0"), filter))
      .orderBy(asc(aptTransactions.changeRate))
      .limit(10),
    db.select(txFields).from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .where(and(eq(aptTransactions.isNewHigh, true), filter))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(10),
    db.select(txFields).from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .where(filter)
      .orderBy(desc(aptTransactions.tradeDate), desc(aptTransactions.tradePrice))
      .limit(10),
    db.select(txFields).from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .where(filter)
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(10),
    db.select({
      rate_type: financeRates.rateType,
      rate_value: financeRates.rateValue,
      prev_value: financeRates.prevValue,
      change_bp: financeRates.changeBp,
      base_date: financeRates.baseDate,
      source: financeRates.source,
    }).from(financeRates)
      .orderBy(desc(financeRates.baseDate))
      .limit(5),
    db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
    db.select({ count: sql<number>`count(*)` }).from(aptComplexes),
  ]);

  const drops = applyRankingNormalization(
    normalizeHomeTransactions(dropsRes.status === "fulfilled" ? dropsRes.value : [])
  ).sort((a, b) => (a.change_rate ?? 0) - (b.change_rate ?? 0));

  return {
    drops: drops.slice(0, 10),
    highs: normalizeHomeTransactions(highsRes.status === "fulfilled" ? highsRes.value : []),
    volume: normalizeHomeTransactions(volumeRes.status === "fulfilled" ? volumeRes.value : []),
    recent: normalizeHomeTransactions(recentRes.status === "fulfilled" ? recentRes.value : []),
    rates: normalizeFinanceRates(ratesRes.status === "fulfilled" ? ratesRes.value : []),
    totalTxns: txnCount.status === "fulfilled" ? Number(txnCount.value[0]?.count ?? 0) : 0,
    totalComplexes: complexCount.status === "fulfilled" ? Number(complexCount.value[0]?.count ?? 0) : 0,
  };
}

async function fetchPopularHomeItems(): Promise<HomePopularItem[]> {
  const startDateStr = pageviewStartDate(7);
  const popularViewCount = sql<number>`COALESCE(SUM(${pageViews.viewCount}), 0)::int`;

  return db.select({
    page_path: pageViews.pagePath,
    page_type: pageViews.pageType,
    view_count: popularViewCount,
  }).from(pageViews)
    .where(and(gte(pageViews.viewDate, startDateStr), eq(pageViews.pageType, "apt_detail")))
    .groupBy(pageViews.pagePath, pageViews.pageType)
    .orderBy(desc(popularViewCount))
    .limit(10);
}

async function fetchHomePageData(validType: number): Promise<HomePageData> {
  const [homepageData, popularItems] = await Promise.all([
    fetchHomepageCacheData(validType),
    fetchPopularHomeItems(),
  ]);

  return {
    ...homepageData,
    popularItems,
  };
}

export const getCachedHomePageData = unstable_cache(
  fetchHomePageData,
  ["home-page-data-v1"],
  {
    revalidate: 1800,
    tags: [
      PUBLIC_DATA_CACHE_TAGS.HOMEPAGE,
      PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
      PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES,
      PUBLIC_DATA_CACHE_TAGS.PAGE_VIEWS,
    ],
  },
);
