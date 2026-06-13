import { unstable_cache } from "next/cache";
import { and, desc, eq, ne, or } from "drizzle-orm";
import type {
  AptRentTransaction as AptDetailRentTransaction,
  AptTransaction as AptDetailSaleTransaction,
} from "@/components/apt/AptDetailClient";
import { toDbSlug } from "@/lib/apt-url";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import {
  aptComplexes,
  aptRentTransactions,
  aptTransactions,
} from "@/lib/db/schema";

export type AptDetailComplex = typeof aptComplexes.$inferSelect;
export type {
  AptDetailRentTransaction,
  AptDetailSaleTransaction,
};

export type AptDetailNearbyComplex = {
  govt_complex_id: string | null;
  slug: string;
  apt_name: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  built_year: number | null;
  total_units: number | null;
};

type SaleRow = {
  id: string;
  size_sqm: number | string;
  floor: number | null;
  trade_price: number | string;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | string | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  deal_type: string | null;
  drop_level: string;
};

type RentRow = {
  id: string;
  size_sqm: number | string | null;
  floor: number | null;
  deposit: number | null;
  monthly_rent: number | null;
  rent_type: string | null;
  contract_type: string | null;
  trade_date: string | null;
};

const APT_DETAIL_REVALIDATE_SECONDS = 3600;
const APT_DETAIL_SALE_LIMIT = 50;
const APT_DETAIL_RENT_LIMIT = 200;
const APT_DETAIL_NEARBY_LIMIT = 5;
const APT_DETAIL_REGION_CANDIDATE_LIMIT = 200;

function saleTransactionWhere(
  complexId: string,
  aptName: string,
  regionCode: string,
  propertyType: number
) {
  return or(
    eq(aptTransactions.complexId, complexId),
    and(
      eq(aptTransactions.aptName, aptName),
      eq(aptTransactions.regionCode, regionCode),
      eq(aptTransactions.propertyType, propertyType),
    ),
  );
}

function normalizeAptName(value: string): string {
  return value.replace(/[\s-]/g, "").toLowerCase();
}

function normalizeSaleTransaction(row: SaleRow): AptDetailSaleTransaction {
  return {
    ...row,
    size_sqm: Number(row.size_sqm),
    floor: row.floor ?? 0,
    trade_price: Number(row.trade_price),
    highest_price: row.highest_price,
    change_rate: row.change_rate === null ? null : Number(row.change_rate),
  };
}

function normalizeRentTransaction(row: RentRow): AptDetailRentTransaction {
  return {
    ...row,
    size_sqm: Number(row.size_sqm ?? 0),
    deposit: row.deposit ?? 0,
    monthly_rent: row.monthly_rent ?? 0,
    rent_type: row.rent_type ?? "",
    trade_date: row.trade_date ?? "",
  };
}

export async function getAptDetailComplexByGovtId(
  govtComplexId: string
): Promise<AptDetailComplex | null> {
  const complexRows = await db.select().from(aptComplexes)
    .where(eq(aptComplexes.govtComplexId, govtComplexId))
    .limit(1);

  const complex = complexRows[0] ?? null;
  if (complex || !govtComplexId.includes("-")) return complex;

  const fallbackRows = await db.select().from(aptComplexes)
    .where(eq(aptComplexes.slug, govtComplexId))
    .limit(1);

  return fallbackRows[0] ?? null;
}

export async function getAptDetailComplexByLookupId(
  id: string
): Promise<AptDetailComplex | null> {
  const complexRows = await db.select().from(aptComplexes)
    .where(or(
      eq(aptComplexes.id, id),
      eq(aptComplexes.slug, id),
      eq(aptComplexes.govtComplexId, id),
    ))
    .limit(1);

  return complexRows[0] ?? null;
}

export async function getAptDetailComplexBySlug(
  regionCode: string,
  decodedSlug: string
): Promise<AptDetailComplex | null> {
  const dbSlug = toDbSlug(regionCode, decodedSlug);
  const complexRows = await db.select().from(aptComplexes)
    .where(eq(aptComplexes.slug, dbSlug))
    .limit(1);

  if (complexRows[0]) return complexRows[0];

  if (dbSlug !== decodedSlug) {
    const fallbackRows = await db.select().from(aptComplexes)
      .where(eq(aptComplexes.slug, decodedSlug))
      .limit(1);
    if (fallbackRows[0]) return fallbackRows[0];
  }

  const dashIdx = decodedSlug.indexOf("-");
  const nameCandidate = dashIdx > 0
    ? decodedSlug.substring(dashIdx + 1)
    : decodedSlug;
  const cleanName = normalizeAptName(decodeURIComponent(nameCandidate).replace(/-/g, ""));

  const candidates = await db.select().from(aptComplexes)
    .where(eq(aptComplexes.regionCode, regionCode))
    .limit(APT_DETAIL_REGION_CANDIDATE_LIMIT);

  return candidates.find((candidate) =>
    normalizeAptName(candidate.aptName ?? "") === cleanName ||
    candidate.aptName === nameCandidate
  ) ?? null;
}

export async function getAptDetailSaleTransactions(
  complexId: string,
  aptName: string,
  regionCode: string,
  propertyType: number
): Promise<AptDetailSaleTransaction[]> {
  const rows = await db.select({
    id: aptTransactions.id,
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
  }).from(aptTransactions)
    .where(saleTransactionWhere(complexId, aptName, regionCode, propertyType))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(APT_DETAIL_SALE_LIMIT);

  return rows.map(normalizeSaleTransaction);
}

export async function getAptDetailRentTransactions(
  aptName: string,
  regionCode: string
): Promise<AptDetailRentTransaction[]> {
  const rows = await db.select({
    id: aptRentTransactions.id,
    size_sqm: aptRentTransactions.sizeSqm,
    floor: aptRentTransactions.floor,
    deposit: aptRentTransactions.deposit,
    monthly_rent: aptRentTransactions.monthlyRent,
    rent_type: aptRentTransactions.rentType,
    contract_type: aptRentTransactions.contractType,
    trade_date: aptRentTransactions.tradeDate,
  }).from(aptRentTransactions)
    .where(and(
      eq(aptRentTransactions.aptName, aptName),
      eq(aptRentTransactions.regionCode, regionCode),
    ))
    .orderBy(desc(aptRentTransactions.tradeDate))
    .limit(APT_DETAIL_RENT_LIMIT);

  return rows.map(normalizeRentTransaction);
}

export async function getAptDetailNearbyComplexes(
  complexId: string,
  dongName: string | null
): Promise<AptDetailNearbyComplex[]> {
  if (!dongName) return [];

  return db.select({
    govt_complex_id: aptComplexes.govtComplexId,
    slug: aptComplexes.slug,
    apt_name: aptComplexes.aptName,
    region_code: aptComplexes.regionCode,
    region_name: aptComplexes.regionName,
    dong_name: aptComplexes.dongName,
    built_year: aptComplexes.builtYear,
    total_units: aptComplexes.totalUnits,
  }).from(aptComplexes)
    .where(and(
      eq(aptComplexes.dongName, dongName),
      ne(aptComplexes.id, complexId),
    ))
    .limit(APT_DETAIL_NEARBY_LIMIT);
}

export const getCachedAptDetailComplexByGovtId = unstable_cache(
  getAptDetailComplexByGovtId,
  ["apt-detail-complex-by-govt-id-v1"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);

export const getCachedAptDetailComplexByLookupId = unstable_cache(
  getAptDetailComplexByLookupId,
  ["apt-detail-complex-by-lookup-id-v1"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);

export const getCachedAptDetailComplexBySlug = unstable_cache(
  getAptDetailComplexBySlug,
  ["apt-detail-complex-by-slug-v1"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);

export const getCachedAptDetailSaleTransactions = unstable_cache(
  getAptDetailSaleTransactions,
  ["apt-detail-sale-transactions-v1"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  },
);

export const getCachedAptDetailRentTransactions = unstable_cache(
  getAptDetailRentTransactions,
  ["apt-detail-rent-transactions-v1"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS],
  },
);

export const getCachedAptDetailNearbyComplexes = unstable_cache(
  getAptDetailNearbyComplexes,
  ["apt-detail-nearby-complexes-v1"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);
