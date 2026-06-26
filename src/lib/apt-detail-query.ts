import { unstable_cache } from "next/cache";
import { and, desc, eq, or, sql } from "drizzle-orm";
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
  identity_id: string | null;
  slug: string;
  apt_name: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  built_year: number | null;
  total_units: number | null;
  latest_trade_price: number | null;
  latest_trade_date: string | null;
  latest_rent_deposit: number | null;
  latest_rent_monthly_rent: number | null;
  latest_rent_date: string | null;
  jeonse_ratio: number | null;
  gap_amount: number | null;
  trade_count: number;
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

type NearbyRow = {
  id: string;
  govt_complex_id: string | null;
  identity_id: string | null;
  slug: string;
  apt_name: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  built_year: number | string | null;
  total_units: number | string | null;
  property_type: number | string;
  latest_trade_price: number | string | null;
  latest_trade_date: string | null;
  latest_rent_deposit: number | string | null;
  latest_rent_monthly_rent: number | string | null;
  latest_rent_date: string | null;
  jeonse_ratio: number | string | null;
  gap_amount: number | string | null;
  trade_count: number | string | null;
};

type NearbyBaseRow = Omit<
  NearbyRow,
  | "latest_trade_price"
  | "latest_trade_date"
  | "latest_rent_deposit"
  | "latest_rent_monthly_rent"
  | "latest_rent_date"
  | "jeonse_ratio"
  | "gap_amount"
  | "trade_count"
>;

type NearbySaleMetricRow = {
  trade_price: number | string | null;
  trade_date: string | null;
  size_sqm: number | string | null;
};

type NearbyRentMetricRow = {
  deposit: number | string | null;
  monthly_rent: number | string | null;
  trade_date: string | null;
  size_sqm: number | string | null;
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
  propertyType: number,
  identityId?: string | null
) {
  return or(
    eq(aptTransactions.complexId, complexId),
    identityId ? eq(aptTransactions.identityId, identityId) : undefined,
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

function normalizeNearbyComplex(row: NearbyRow): AptDetailNearbyComplex {
  return {
    govt_complex_id: row.govt_complex_id,
    identity_id: row.identity_id,
    slug: row.slug,
    apt_name: row.apt_name,
    region_code: row.region_code,
    region_name: row.region_name,
    dong_name: row.dong_name,
    built_year: row.built_year === null ? null : Number(row.built_year),
    total_units: row.total_units === null ? null : Number(row.total_units),
    latest_trade_price: row.latest_trade_price === null ? null : Number(row.latest_trade_price),
    latest_trade_date: row.latest_trade_date,
    latest_rent_deposit: row.latest_rent_deposit === null ? null : Number(row.latest_rent_deposit),
    latest_rent_monthly_rent: row.latest_rent_monthly_rent === null
      ? null
      : Number(row.latest_rent_monthly_rent),
    latest_rent_date: row.latest_rent_date,
    jeonse_ratio: row.jeonse_ratio === null ? null : Number(row.jeonse_ratio),
    gap_amount: row.gap_amount === null ? null : Number(row.gap_amount),
    trade_count: row.trade_count === null ? 0 : Number(row.trade_count),
  };
}

function normalizeNearbySaleMetric(
  row: NearbySaleMetricRow | null | undefined
): NearbySaleMetricRow | null {
  if (!row?.trade_date) return null;

  return {
    trade_price: row.trade_price === null ? null : Number(row.trade_price),
    trade_date: row.trade_date,
    size_sqm: row.size_sqm === null ? null : Number(row.size_sqm),
  };
}

function normalizeNearbyRentMetric(
  row: NearbyRentMetricRow | null | undefined
): NearbyRentMetricRow | null {
  if (!row?.trade_date) return null;

  return {
    deposit: row.deposit === null ? null : Number(row.deposit),
    monthly_rent: row.monthly_rent === null ? null : Number(row.monthly_rent),
    trade_date: row.trade_date,
    size_sqm: row.size_sqm === null ? null : Number(row.size_sqm),
  };
}

function isSameSizeRent(
  rent: NearbyRentMetricRow,
  saleSize: number | string | null | undefined
): boolean {
  if (saleSize === null || saleSize === undefined || rent.size_sqm === null) return true;
  return Math.abs(Number(rent.size_sqm) - Number(saleSize)) <= 1;
}

async function getLatestNearbySaleMetric(
  complex: NearbyBaseRow
): Promise<NearbySaleMetricRow | null> {
  const byComplex = await db.execute(sql`
    SELECT t.trade_price, t.trade_date, t.size_sqm
    FROM apt_transactions@idx_txn_complex t
    WHERE t.complex_id = ${complex.id}
    ORDER BY t.trade_date DESC
    LIMIT 1
  `);
  const complexMetric = normalizeNearbySaleMetric(
    (byComplex.rows as unknown as NearbySaleMetricRow[])[0],
  );
  if (complexMetric || !complex.identity_id) return complexMetric;

  const byIdentity = await db.execute(sql`
    SELECT t.trade_price, t.trade_date, t.size_sqm
    FROM apt_transactions@idx_transactions_identity_id t
    WHERE t.identity_id = ${complex.identity_id}
    ORDER BY t.trade_date DESC
    LIMIT 1
  `);

  return normalizeNearbySaleMetric(
    (byIdentity.rows as unknown as NearbySaleMetricRow[])[0],
  );
}

async function getLatestNearbyRentMetric(
  complex: NearbyBaseRow,
  saleSize: number | string | null | undefined
): Promise<NearbyRentMetricRow | null> {
  const byComplex = await db.execute(sql`
    SELECT r.deposit, r.monthly_rent, r.trade_date, r.size_sqm
    FROM apt_rent_transactions@idx_rent_complex_date r
    WHERE r.complex_id = ${complex.id}
    ORDER BY r.trade_date DESC
    LIMIT 5
  `);
  const complexMetric = (byComplex.rows as unknown as NearbyRentMetricRow[])
    .map(normalizeNearbyRentMetric)
    .find((row): row is NearbyRentMetricRow => row !== null && isSameSizeRent(row, saleSize));
  if (complexMetric || !complex.identity_id) return complexMetric ?? null;

  const byIdentity = await db.execute(sql`
    SELECT r.deposit, r.monthly_rent, r.trade_date, r.size_sqm
    FROM apt_rent_transactions@idx_rent_identity_date r
    WHERE r.identity_id = ${complex.identity_id}
    ORDER BY r.trade_date DESC
    LIMIT 5
  `);

  return (byIdentity.rows as unknown as NearbyRentMetricRow[])
    .map(normalizeNearbyRentMetric)
    .find((row): row is NearbyRentMetricRow => row !== null && isSameSizeRent(row, saleSize)) ?? null;
}

async function getNearbyTradeCount(complex: NearbyBaseRow): Promise<number> {
  const byComplex = await db.execute(sql`
    SELECT COUNT(*)::INT AS cnt
    FROM apt_transactions@idx_txn_complex t
    WHERE t.complex_id = ${complex.id}
  `);
  const complexCount = Number((byComplex.rows[0] as { cnt?: number | string } | undefined)?.cnt ?? 0);
  if (!complex.identity_id) return complexCount;

  const byIdentity = await db.execute(sql`
    SELECT COUNT(*)::INT AS cnt
    FROM apt_transactions@idx_transactions_identity_id t
    WHERE t.identity_id = ${complex.identity_id}
      AND (t.complex_id IS NULL OR t.complex_id <> ${complex.id})
  `);
  const identityCount = Number((byIdentity.rows[0] as { cnt?: number | string } | undefined)?.cnt ?? 0);

  return complexCount + identityCount;
}

async function attachNearbyMetrics(
  complex: NearbyBaseRow
): Promise<NearbyRow> {
  const latestSale = await getLatestNearbySaleMetric(complex);
  const latestRent = await getLatestNearbyRentMetric(complex, latestSale?.size_sqm);
  const tradeCount = await getNearbyTradeCount(complex);
  const tradePrice = latestSale?.trade_price === null || latestSale?.trade_price === undefined
    ? null
    : Number(latestSale.trade_price);
  const rentDeposit = latestRent?.deposit === null || latestRent?.deposit === undefined
    ? null
    : Number(latestRent.deposit);
  const monthlyRent = latestRent?.monthly_rent === null || latestRent?.monthly_rent === undefined
    ? null
    : Number(latestRent.monthly_rent);
  const jeonseRatio = tradePrice && tradePrice > 0 && rentDeposit !== null && monthlyRent === 0
    ? Number(((rentDeposit / tradePrice) * 100).toFixed(1))
    : null;
  const gapAmount = tradePrice !== null && rentDeposit !== null && monthlyRent === 0
    ? tradePrice - rentDeposit
    : null;

  return {
    ...complex,
    latest_trade_price: tradePrice,
    latest_trade_date: latestSale?.trade_date ?? null,
    latest_rent_deposit: rentDeposit,
    latest_rent_monthly_rent: monthlyRent,
    latest_rent_date: latestRent?.trade_date ?? null,
    jeonse_ratio: jeonseRatio,
    gap_amount: gapAmount,
    trade_count: tradeCount,
  };
}

export async function getAptDetailComplexByGovtId(
  govtComplexId: string
): Promise<AptDetailComplex | null> {
  const complexRows = await db.select().from(aptComplexes)
    .where(eq(aptComplexes.govtComplexId, govtComplexId))
    .limit(1);

  const complex = complexRows[0] ?? null;
  if (complex) return complex;

  const identityRows = await db.select().from(aptComplexes)
    .where(eq(aptComplexes.identityId, govtComplexId))
    .limit(1);

  const identityComplex = identityRows[0] ?? null;
  if (identityComplex || !govtComplexId.includes("-")) return identityComplex;

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
      eq(aptComplexes.identityId, id),
    ))
    .limit(1);

  return complexRows[0] ?? null;
}

export async function getAptDetailComplexBySlug(
  regionCode: string,
  decodedSlug: string
): Promise<AptDetailComplex | null> {
  const dbSlug = toDbSlug(regionCode, decodedSlug);
  const prefixedSlug = `${regionCode}-${decodedSlug}`;
  const complexRows = await db.select().from(aptComplexes)
    .where(or(
      eq(aptComplexes.slug, dbSlug),
      eq(aptComplexes.slug, prefixedSlug),
    ))
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
  propertyType: number,
  identityId?: string | null
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
    .where(saleTransactionWhere(complexId, aptName, regionCode, propertyType, identityId))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(APT_DETAIL_SALE_LIMIT);

  return rows.map(normalizeSaleTransaction);
}

export async function getAptDetailRentTransactions(
  aptName: string,
  regionCode: string,
  identityId?: string | null,
  complexId?: string | null
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
    .where(or(
      identityId ? eq(aptRentTransactions.identityId, identityId) : undefined,
      complexId ? eq(aptRentTransactions.complexId, complexId) : undefined,
      and(
        eq(aptRentTransactions.aptName, aptName),
        eq(aptRentTransactions.regionCode, regionCode),
      ),
    ))
    .orderBy(desc(aptRentTransactions.tradeDate))
    .limit(APT_DETAIL_RENT_LIMIT);

  return rows.map(normalizeRentTransaction);
}

export async function getAptDetailNearbyComplexes(
  complexId: string,
  dongName: string | null,
  regionCode: string
): Promise<AptDetailNearbyComplex[]> {
  if (!dongName) return [];

  const result = await db.execute(sql`
    SELECT
      c.id,
      c.govt_complex_id,
      c.identity_id,
      c.slug,
      c.apt_name,
      c.region_code,
      c.region_name,
      c.dong_name,
      c.built_year,
      c.total_units,
      c.property_type
    FROM apt_complexes@idx_complexes_region c
    WHERE c.region_code = ${regionCode}
      AND c.dong_name = ${dongName}
      AND c.id <> ${complexId}
    ORDER BY c.total_units DESC NULLS LAST, c.built_year DESC NULLS LAST, c.apt_name ASC
    LIMIT ${APT_DETAIL_NEARBY_LIMIT}
  `);

  const rowsWithMetrics = await Promise.all(
    (result.rows as unknown as NearbyBaseRow[]).map(attachNearbyMetrics),
  );

  return rowsWithMetrics.map(normalizeNearbyComplex);
}

export const getCachedAptDetailComplexByGovtId = unstable_cache(
  getAptDetailComplexByGovtId,
  ["apt-detail-complex-by-govt-or-identity-id-v2"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);

export const getCachedAptDetailComplexByLookupId = unstable_cache(
  getAptDetailComplexByLookupId,
  ["apt-detail-complex-by-lookup-id-v2"],
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
  ["apt-detail-sale-transactions-v2"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS],
  },
);

export const getCachedAptDetailRentTransactions = unstable_cache(
  getAptDetailRentTransactions,
  ["apt-detail-rent-transactions-v2"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS],
  },
);

export const getCachedAptDetailNearbyComplexes = unstable_cache(
  getAptDetailNearbyComplexes,
  ["apt-detail-nearby-complexes-v3"],
  {
    revalidate: APT_DETAIL_REVALIDATE_SECONDS,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);
