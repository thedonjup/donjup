import { unstable_cache } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { aptComplexes, aptRentTransactions } from "@/lib/db/schema";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import {
  getRentRegionCodes,
  normalizeRentDashboardRow,
  RENT_DASHBOARD_LIMIT,
} from "@/lib/rent-dashboard-data";

const rentSelect = {
  apt_name: aptRentTransactions.aptName,
  region_code: aptRentTransactions.regionCode,
  region_name: aptRentTransactions.regionName,
  size_sqm: aptRentTransactions.sizeSqm,
  floor: aptRentTransactions.floor,
  deposit: aptRentTransactions.deposit,
  monthly_rent: aptRentTransactions.monthlyRent,
  rent_type: aptRentTransactions.rentType,
  contract_type: aptRentTransactions.contractType,
  trade_date: aptRentTransactions.tradeDate,
  complex_slug: aptComplexes.slug,
  govt_complex_id: aptComplexes.govtComplexId,
};

async function fetchRentDashboardData(sidoFilter?: string) {
  const regionFilter = getRentRegionCodes(sidoFilter);
  const regionCondition = regionFilter
    ? inArray(aptRentTransactions.regionCode, regionFilter)
    : undefined;

  const [jeonseResult, wolseResult] = await Promise.all([
    db.select(rentSelect)
      .from(aptRentTransactions)
      .leftJoin(
        aptComplexes,
        and(
          eq(aptRentTransactions.regionCode, aptComplexes.regionCode),
          eq(aptRentTransactions.aptName, aptComplexes.aptName)
        )
      )
      .where(and(
        eq(aptRentTransactions.rentType, "전세"),
        regionCondition
      ))
      .orderBy(desc(aptRentTransactions.deposit))
      .limit(RENT_DASHBOARD_LIMIT),
    db.select(rentSelect)
      .from(aptRentTransactions)
      .leftJoin(
        aptComplexes,
        and(
          eq(aptRentTransactions.regionCode, aptComplexes.regionCode),
          eq(aptRentTransactions.aptName, aptComplexes.aptName)
        )
      )
      .where(and(
        eq(aptRentTransactions.rentType, "월세"),
        regionCondition
      ))
      .orderBy(desc(aptRentTransactions.tradeDate))
      .limit(RENT_DASHBOARD_LIMIT),
  ]);

  return {
    jeonseItems: jeonseResult.map(normalizeRentDashboardRow),
    wolseItems: wolseResult.map(normalizeRentDashboardRow),
  };
}

export const getCachedRentDashboardData = unstable_cache(
  fetchRentDashboardData,
  ["rent-dashboard-data-v1"],
  {
    revalidate: 3600,
    tags: [
      PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
    ],
  }
);
