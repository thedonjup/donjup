export const SEARCH_RESULT_LIMIT = 50;

export interface SearchResult {
  id: string;
  apt_name: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  sido_name: string | null;
  sigungu_name: string | null;
  built_year: number | null;
  total_units: number | null;
  slug: string;
  govt_complex_id: string | null;
  latest_trade_price: number | null;
  latest_trade_date: string | null;
  latest_change_rate: number | null;
  latest_rent_deposit: number | null;
  latest_rent_monthly_rent: number | null;
  latest_rent_date: string | null;
  latest_rent_type: string | null;
}

export interface SearchResultRow {
  id: string;
  apt_name: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  built_year: number | string | null;
  total_units: number | string | null;
  slug: string;
  govt_complex_id: string | null;
  latest_trade_price: number | string | null;
  latest_trade_date: string | null;
  latest_change_rate: number | string | null;
  latest_rent_deposit: number | string | null;
  latest_rent_monthly_rent: number | string | null;
  latest_rent_date: string | null;
  latest_rent_type: string | null;
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

export function normalizeSearchResultRow(row: SearchResultRow): SearchResult {
  return {
    ...row,
    sido_name: null,
    sigungu_name: null,
    total_units: nullableNumber(row.total_units),
    built_year: nullableNumber(row.built_year),
    latest_trade_price: nullableNumber(row.latest_trade_price),
    latest_trade_date: row.latest_trade_date,
    latest_change_rate: nullableNumber(row.latest_change_rate),
    latest_rent_deposit: nullableNumber(row.latest_rent_deposit),
    latest_rent_monthly_rent: nullableNumber(row.latest_rent_monthly_rent),
    latest_rent_date: row.latest_rent_date,
    latest_rent_type: row.latest_rent_type,
  };
}
