import { unstable_cache } from "next/cache";
import { desc, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import {
  normalizeFinanceRateRow,
  RATE_DASHBOARD_QUERY_LIMIT,
} from "@/lib/rate-dashboard-data";

async function fetchRateDashboardRates() {
  const rows = await db.select({
    id: financeRates.id,
    rate_type: financeRates.rateType,
    rate_value: financeRates.rateValue,
    prev_value: financeRates.prevValue,
    change_bp: financeRates.changeBp,
    base_date: financeRates.baseDate,
    source: financeRates.source,
    created_at: financeRates.createdAt,
  }).from(financeRates)
    .where(ne(financeRates.rateType, "BANK_PRODUCTS_ALL"))
    .orderBy(desc(financeRates.baseDate))
    .limit(RATE_DASHBOARD_QUERY_LIMIT);

  return rows.map(normalizeFinanceRateRow);
}

export const getCachedRateDashboardRates = unstable_cache(
  fetchRateDashboardRates,
  ["rate-dashboard-rates-v1"],
  {
    revalidate: 1800,
    tags: [PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES],
  }
);
