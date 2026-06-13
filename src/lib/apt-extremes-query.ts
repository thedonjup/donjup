import { unstable_cache } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import type { AptExtremeType } from "@/lib/apt-extremes-params";

const aptExtremeTransactionSelect = {
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
};

export async function getAptExtremeTransactions(
  type: AptExtremeType,
  limit: number
) {
  if (type === "high") {
    return db
      .select(aptExtremeTransactionSelect)
      .from(aptTransactions)
      .where(eq(aptTransactions.isNewHigh, true))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(limit);
  }

  return db
    .select(aptExtremeTransactionSelect)
    .from(aptTransactions)
    .where(eq(aptTransactions.isSignificantDrop, true))
    .orderBy(asc(aptTransactions.changeRate))
    .limit(limit);
}

export const getCachedAptExtremeTransactions = unstable_cache(
  getAptExtremeTransactions,
  ["apt-extreme-transactions-v1"],
  {
    revalidate: 300,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  }
);
