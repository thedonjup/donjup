import { unstable_cache } from "next/cache";
import { asc, desc, eq, gte, ne } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { isDisplayBankRateType } from "@/lib/rate-dashboard-data";

export type RateHistoryItem = {
  rate_type: string;
  rate_value: string | number;
  change_bp: number | null;
  base_date: string;
};

export type BankRateItem = {
  rate_type: string;
  rate_value: string | number;
  base_date: string;
};

export type BankRatesResult = {
  rates: BankRateItem[];
  minRate: number | null;
};

function monthsAgoIsoDate(months: number): string {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return startDate.toISOString().split("T")[0] ?? "";
}

export async function getRateHistory(
  rateType: string | null,
  months: number
): Promise<RateHistoryItem[]> {
  return db
    .select({
      rate_type: financeRates.rateType,
      rate_value: financeRates.rateValue,
      change_bp: financeRates.changeBp,
      base_date: financeRates.baseDate,
    })
    .from(financeRates)
    .where(
      rateType
        ? eq(financeRates.rateType, rateType)
        : gte(financeRates.baseDate, monthsAgoIsoDate(months))
    )
    .orderBy(asc(financeRates.baseDate))
    .limit(500);
}

export async function getLatestBankRates(): Promise<BankRatesResult> {
  const rows = await db
    .select({
      rate_type: financeRates.rateType,
      rate_value: financeRates.rateValue,
      base_date: financeRates.baseDate,
    })
    .from(financeRates)
    .where(ne(financeRates.rateType, "BANK_PRODUCTS_ALL"))
    .orderBy(desc(financeRates.baseDate))
    .limit(50);

  const latestByBank = new Map<string, BankRateItem>();
  for (const row of rows) {
    if (isDisplayBankRateType(row.rate_type) && !latestByBank.has(row.rate_type)) {
      latestByBank.set(row.rate_type, row);
    }
  }

  const rates = Array.from(latestByBank.values());
  const minRate = rates.length > 0
    ? Math.min(...rates.map((rate) => Number(rate.rate_value)))
    : null;

  return { rates, minRate };
}

export const getCachedRateHistory = unstable_cache(
  getRateHistory,
  ["rate-history-v1"],
  {
    revalidate: 1800,
    tags: [PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES],
  }
);

export const getCachedLatestBankRates = unstable_cache(
  getLatestBankRates,
  ["latest-bank-rates-v1"],
  {
    revalidate: 1800,
    tags: [PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES],
  }
);
