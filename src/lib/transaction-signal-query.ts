import { unstable_cache } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import {
  NEW_HIGH_TRANSACTION_LIMIT,
  normalizeNewHighTransactionRow,
  normalizeTodayTransactionRow,
  TODAY_TRANSACTION_LIMIT,
} from "@/lib/transaction-signal-data";

const todayTransactionSelect = {
  id: aptTransactions.id,
  region_code: aptTransactions.regionCode,
  apt_name: aptTransactions.aptName,
  size_sqm: aptTransactions.sizeSqm,
  floor: aptTransactions.floor,
  trade_price: aptTransactions.tradePrice,
  trade_date: aptTransactions.tradeDate,
  change_rate: aptTransactions.changeRate,
  deal_type: aptTransactions.dealType,
  drop_level: aptTransactions.dropLevel,
  property_type: aptTransactions.propertyType,
  complex_slug: aptComplexes.slug,
  govt_complex_id: aptComplexes.govtComplexId,
};

const newHighTransactionSelect = {
  id: aptTransactions.id,
  region_code: aptTransactions.regionCode,
  apt_name: aptTransactions.aptName,
  size_sqm: aptTransactions.sizeSqm,
  trade_price: aptTransactions.tradePrice,
  trade_date: aptTransactions.tradeDate,
  deal_type: aptTransactions.dealType,
  property_type: aptTransactions.propertyType,
  complex_slug: aptComplexes.slug,
  govt_complex_id: aptComplexes.govtComplexId,
};

function propertyTypeFilter(propertyType: number) {
  return propertyType !== 0
    ? eq(aptTransactions.propertyType, propertyType)
    : undefined;
}

async function fetchTodayTransactions(propertyType: number) {
  const rows = await db.select(todayTransactionSelect)
    .from(aptTransactions)
    .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
    .where(propertyTypeFilter(propertyType))
    .orderBy(desc(aptTransactions.tradeDate), desc(aptTransactions.tradePrice))
    .limit(TODAY_TRANSACTION_LIMIT);

  return rows.map(normalizeTodayTransactionRow);
}

async function fetchNewHighTransactions(propertyType: number) {
  const rows = await db.select(newHighTransactionSelect)
    .from(aptTransactions)
    .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
    .where(and(eq(aptTransactions.isNewHigh, true), propertyTypeFilter(propertyType)))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(NEW_HIGH_TRANSACTION_LIMIT);

  return rows.map(normalizeNewHighTransactionRow);
}

export const getCachedTodayTransactions = unstable_cache(
  fetchTodayTransactions,
  ["today-transactions-v1"],
  {
    revalidate: 1800,
    tags: [
      PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
    ],
  }
);

export const getCachedNewHighTransactions = unstable_cache(
  fetchNewHighTransactions,
  ["new-high-transactions-v1"],
  {
    revalidate: 1800,
    tags: [
      PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
    ],
  }
);
