import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import {
  hasSearchFilters,
  SEARCH_LIKE_ESCAPE,
  type SearchFilters,
  toSearchLikePattern,
} from "@/lib/search-filters";
import { searchRegionCode } from "@/lib/search-region-map";
import {
  normalizeSearchResultRow,
  SEARCH_RESULT_LIMIT,
  type SearchResult,
  type SearchResultRow,
} from "@/lib/search-query-data";
import type { SearchSortKey } from "@/lib/search-sort";

type SqlChunk = ReturnType<typeof sql>;

export type SearchResultsQuery = {
  query: string;
  propertyType: number;
  filters: SearchFilters;
  sort: SearchSortKey;
};

function addQueryConditions(query: string, conditions: SqlChunk[]): string {
  const parts = query.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  if (parts.length >= 2) {
    const regionPart = parts[0];
    const aptPart = parts.slice(1).join(" ");
    const regionPattern = toSearchLikePattern(regionPart);
    const aptPattern = toSearchLikePattern(aptPart);
    const regionCode = searchRegionCode(regionPart);

    if (regionCode) {
      if (regionCode.length === 2) {
        conditions.push(sql`c.region_code LIKE ${regionCode + "%"}`);
      } else {
        conditions.push(sql`c.region_code = ${regionCode}`);
      }
    } else {
      conditions.push(sql`(c.region_name ILIKE ${regionPattern} ESCAPE ${SEARCH_LIKE_ESCAPE} OR c.dong_name ILIKE ${regionPattern} ESCAPE ${SEARCH_LIKE_ESCAPE})`);
    }
    conditions.push(sql`c.apt_name ILIKE ${aptPattern} ESCAPE ${SEARCH_LIKE_ESCAPE}`);
    return aptPart;
  }

  const keyword = parts[0];
  const regionCode = searchRegionCode(keyword);
  const keywordPattern = toSearchLikePattern(keyword);

  if (regionCode) {
    if (regionCode.length === 2) {
      conditions.push(sql`(c.region_code LIKE ${regionCode + "%"} OR c.apt_name ILIKE ${keywordPattern} ESCAPE ${SEARCH_LIKE_ESCAPE} OR c.dong_name ILIKE ${keywordPattern} ESCAPE ${SEARCH_LIKE_ESCAPE})`);
    } else {
      conditions.push(sql`(c.region_code = ${regionCode} OR c.apt_name ILIKE ${keywordPattern} ESCAPE ${SEARCH_LIKE_ESCAPE} OR c.dong_name ILIKE ${keywordPattern} ESCAPE ${SEARCH_LIKE_ESCAPE})`);
    }
  } else {
    conditions.push(sql`(c.apt_name ILIKE ${keywordPattern} ESCAPE ${SEARCH_LIKE_ESCAPE} OR c.region_name ILIKE ${keywordPattern} ESCAPE ${SEARCH_LIKE_ESCAPE} OR c.dong_name ILIKE ${keywordPattern} ESCAPE ${SEARCH_LIKE_ESCAPE})`);
  }

  return keyword;
}

function transactionConditions(filters: SearchFilters): SqlChunk[] {
  const conditions: SqlChunk[] = [];

  if (filters.priceMin !== null) {
    conditions.push(sql`t.trade_price >= ${filters.priceMin}`);
  }
  if (filters.priceMax !== null) {
    conditions.push(sql`t.trade_price <= ${filters.priceMax}`);
  }
  if (filters.sizeMin !== null) {
    conditions.push(sql`t.size_sqm >= ${filters.sizeMin}`);
  }
  if (filters.sizeMax !== null) {
    conditions.push(sql`t.size_sqm <= ${filters.sizeMax}`);
  }

  return conditions;
}

function createRelevanceOrder(searchRankTerm: string): SqlChunk {
  if (!searchRankTerm) {
    return sql`c.apt_name`;
  }

  const aptPattern = toSearchLikePattern(searchRankTerm);
  return sql`CASE WHEN c.apt_name ILIKE ${aptPattern} ESCAPE ${SEARCH_LIKE_ESCAPE} THEN 0 ELSE 1 END, c.apt_name`;
}

function createSearchOrder(searchRankTerm: string, sort: SearchSortKey): SqlChunk {
  const relevanceOrder = createRelevanceOrder(searchRankTerm);
  const latestActivityDate = sql`CASE
    WHEN latest_tx.trade_date IS NULL THEN latest_rent.trade_date
    WHEN latest_rent.trade_date IS NULL THEN latest_tx.trade_date
    WHEN latest_tx.trade_date >= latest_rent.trade_date THEN latest_tx.trade_date
    ELSE latest_rent.trade_date
  END`;

  if (sort === "recent") {
    return sql`${latestActivityDate} DESC NULLS LAST, ${relevanceOrder}`;
  }

  if (sort === "biggest-drop") {
    return sql`latest_tx.change_rate ASC NULLS LAST, latest_tx.trade_date DESC NULLS LAST, ${relevanceOrder}`;
  }

  if (sort === "highest-price") {
    return sql`latest_tx.trade_price DESC NULLS LAST, latest_tx.trade_date DESC NULLS LAST, ${relevanceOrder}`;
  }

  return relevanceOrder;
}

export async function getSearchResults({
  query,
  propertyType,
  filters,
  sort,
}: SearchResultsQuery): Promise<SearchResult[]> {
  if (query.length === 0 && !hasSearchFilters(filters)) {
    return [];
  }

  const conditions: SqlChunk[] = [];

  if (propertyType !== 0) {
    conditions.push(sql`c.property_type = ${propertyType}`);
  }

  const searchRankTerm = addQueryConditions(query, conditions);

  if (filters.builtYearMin !== null) {
    conditions.push(sql`c.built_year >= ${filters.builtYearMin}`);
  }

  const txConditions = transactionConditions(filters);
  const txMatch = sql`(t.complex_id = c.id OR (t.complex_id IS NULL AND t.apt_name = c.apt_name AND t.region_code = c.region_code AND t.property_type = c.property_type))`;
  const rentMatch = sql`r.apt_name = c.apt_name
    AND r.region_code = c.region_code
    AND (c.dong_name IS NULL OR r.raw_data->>'umdNm' IS NULL OR r.raw_data->>'umdNm' = c.dong_name)`;
  const txWhere = txConditions.length > 0
    ? sql`AND ${sql.join(txConditions, sql` AND `)}`
    : sql``;

  if (txConditions.length > 0) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM apt_transactions t
      WHERE ${txMatch} ${txWhere}
    )`);
  }

  const complexWhere = conditions.length > 0
    ? sql.join(conditions, sql` AND `)
    : sql`TRUE`;

  const result = await db.execute(sql`SELECT
      c.id,
      c.apt_name,
      c.region_code,
      c.region_name,
      c.dong_name,
      c.built_year,
      c.total_units,
      c.slug,
      c.govt_complex_id,
      c.identity_id,
      latest_tx.trade_price AS latest_trade_price,
      latest_tx.trade_date AS latest_trade_date,
      latest_tx.change_rate AS latest_change_rate,
      latest_rent.deposit AS latest_rent_deposit,
      latest_rent.monthly_rent AS latest_rent_monthly_rent,
      latest_rent.trade_date AS latest_rent_date,
      latest_rent.rent_type AS latest_rent_type
    FROM apt_complexes c
    LEFT JOIN LATERAL (
      SELECT t.trade_price, t.trade_date, t.change_rate
      FROM apt_transactions t
      WHERE ${txMatch} ${txWhere}
      ORDER BY t.trade_date DESC
      LIMIT 1
    ) latest_tx ON TRUE
    LEFT JOIN LATERAL (
      SELECT r.deposit, r.monthly_rent, r.trade_date, r.rent_type
      FROM apt_rent_transactions r
      WHERE ${rentMatch}
      ORDER BY r.trade_date DESC
      LIMIT 1
    ) latest_rent ON TRUE
    WHERE ${complexWhere}
    ORDER BY ${createSearchOrder(searchRankTerm, sort)}
    LIMIT ${SEARCH_RESULT_LIMIT}`);

  return (result.rows as unknown as SearchResultRow[]).map(normalizeSearchResultRow);
}

export const getCachedSearchResults = unstable_cache(
  getSearchResults,
  ["search-results-v2"],
  {
    revalidate: 300,
    tags: [
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
      PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
      PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS,
    ],
  }
);
