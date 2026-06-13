import { and, desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import { revalidatePublicDataCaches } from "@/lib/cache-revalidation";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import {
  aptComplexes,
  aptTransactions,
  financeRates,
  homepageCache,
  type NewHomepageCache,
} from "@/lib/db/schema";

const HOMEPAGE_CACHE_ROW_ID = 1;
const HOMEPAGE_CACHE_TRANSACTION_LIMIT = 30;
const HOMEPAGE_CACHE_RATE_LIMIT = 5;

const homepageTransactionFields = {
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
  property_type: aptTransactions.propertyType,
  complex_slug: aptComplexes.slug,
  govt_complex_id: aptComplexes.govtComplexId,
};

type RefreshHomepageCachePayload = {
  dropsRows: unknown[];
  highsRows: unknown[];
  volumeRows: unknown[];
  recentRows: unknown[];
  ratesRows: unknown[];
  totalTransactions: number;
  totalComplexes: number;
  updatedAt?: Date;
};

export function homepageCacheUpsertValues({
  dropsRows,
  highsRows,
  volumeRows,
  recentRows,
  ratesRows,
  totalTransactions,
  totalComplexes,
  updatedAt = new Date(),
}: RefreshHomepageCachePayload): NewHomepageCache {
  return {
    id: HOMEPAGE_CACHE_ROW_ID,
    drops: dropsRows,
    highs: highsRows,
    volume: volumeRows,
    recent: recentRows,
    rates: ratesRows,
    totalTransactions,
    totalComplexes,
    updatedAt,
  };
}

export async function refreshHomepageCache() {
  const [
    dropsRows,
    highsRows,
    volumeRows,
    recentRows,
    ratesRows,
    txnCountRows,
    complexCountRows,
  ] = await Promise.all([
    db
      .select(homepageTransactionFields)
      .from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .where(and(isNotNull(aptTransactions.changeRate), lt(aptTransactions.changeRate, "0")))
      .orderBy(aptTransactions.changeRate)
      .limit(HOMEPAGE_CACHE_TRANSACTION_LIMIT),
    db
      .select(homepageTransactionFields)
      .from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .where(eq(aptTransactions.isNewHigh, true))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(HOMEPAGE_CACHE_TRANSACTION_LIMIT),
    db
      .select(homepageTransactionFields)
      .from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .orderBy(desc(aptTransactions.tradeDate), desc(aptTransactions.tradePrice))
      .limit(HOMEPAGE_CACHE_TRANSACTION_LIMIT),
    db
      .select(homepageTransactionFields)
      .from(aptTransactions)
      .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(HOMEPAGE_CACHE_TRANSACTION_LIMIT),
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
      .limit(HOMEPAGE_CACHE_RATE_LIMIT),
    db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
    db.select({ count: sql<number>`count(*)` }).from(aptComplexes),
  ]);

  const totalTransactions = Number(txnCountRows[0]?.count ?? 0);
  const totalComplexes = Number(complexCountRows[0]?.count ?? 0);
  const values = homepageCacheUpsertValues({
    dropsRows,
    highsRows,
    volumeRows,
    recentRows,
    ratesRows,
    totalTransactions,
    totalComplexes,
  });

  await db
    .insert(homepageCache)
    .values(values)
    .onConflictDoUpdate({
      target: homepageCache.id,
      set: {
        drops: values.drops,
        highs: values.highs,
        volume: values.volume,
        recent: values.recent,
        rates: values.rates,
        totalTransactions: values.totalTransactions,
        totalComplexes: values.totalComplexes,
        updatedAt: values.updatedAt,
      },
    });

  const cacheRevalidation = revalidatePublicDataCaches(
    [
      PUBLIC_DATA_CACHE_TAGS.HOMEPAGE,
      PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
      PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES,
      PUBLIC_DATA_CACHE_TAGS.PAGE_VIEWS,
    ],
    { cron: "refresh-cache" }
  );

  return {
    ok: true,
    total_transactions: totalTransactions,
    total_complexes: totalComplexes,
    drops: dropsRows.length,
    highs: highsRows.length,
    cacheRevalidation,
  };
}
