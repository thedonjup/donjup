import { unstable_cache } from "next/cache";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import {
  createMapTransactionCutoffDate,
  MAP_TRANSACTION_LIMIT,
  normalizeMapTransactionRows,
} from "@/lib/map-dashboard-data";

async function fetchMapTransactions() {
  const cutoff = createMapTransactionCutoffDate();
  const rows = await db
    .select({
      id: aptTransactions.id,
      complex_id: aptComplexes.id,
      govt_complex_id: aptComplexes.govtComplexId,
      identity_id: aptComplexes.identityId,
      apt_name: aptTransactions.aptName,
      region_code: aptTransactions.regionCode,
      trade_price: aptTransactions.tradePrice,
      change_rate: aptTransactions.changeRate,
      is_new_high: aptTransactions.isNewHigh,
      size_sqm: aptTransactions.sizeSqm,
      trade_date: aptTransactions.tradeDate,
      complex_slug: aptComplexes.slug,
      dong_name: aptComplexes.dongName,
      latitude: aptComplexes.latitude,
      longitude: aptComplexes.longitude,
    })
    .from(aptTransactions)
    .innerJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
    .where(and(
      isNotNull(aptComplexes.latitude),
      isNotNull(aptComplexes.longitude),
      gte(aptTransactions.tradeDate, cutoff),
    ))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(MAP_TRANSACTION_LIMIT);

  return normalizeMapTransactionRows(rows);
}

export const getCachedMapTransactions = unstable_cache(
  fetchMapTransactions,
  ["map-transactions-v3"],
  {
    revalidate: 1800,
    tags: [
      PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
    ],
  },
);
