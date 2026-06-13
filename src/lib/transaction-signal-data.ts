export const TODAY_TRANSACTION_LIMIT = 100;
export const NEW_HIGH_TRANSACTION_LIMIT = 50;

const DEFAULT_PROPERTY_TYPE = 1;
const VALID_PROPERTY_TYPES = new Set([0, 1, 2, 3]);

export interface TodayTransaction {
  id: string;
  region_code: string;
  region_name?: string;
  apt_name: string;
  size_sqm: number;
  floor: number | null;
  trade_price: number;
  trade_date: string;
  change_rate: number | null;
  deal_type: string | null;
  drop_level: string | null;
  property_type?: number;
  complex_slug: string | null;
  govt_complex_id: string | null;
}

export interface NewHighTransaction {
  id: string;
  region_code: string;
  region_name?: string;
  apt_name: string;
  size_sqm: number;
  trade_price: number;
  trade_date: string;
  deal_type: string | null;
  property_type?: number;
  complex_slug: string | null;
  govt_complex_id: string | null;
}

export interface TodayTransactionRow {
  id: string;
  region_code: string;
  apt_name: string;
  size_sqm: string | number;
  floor: number | null;
  trade_price: number;
  trade_date: string;
  change_rate: string | number | null;
  deal_type: string | null;
  drop_level: string | null;
  property_type: number;
  complex_slug: string | null;
  govt_complex_id: string | null;
}

export interface NewHighTransactionRow {
  id: string;
  region_code: string;
  apt_name: string;
  size_sqm: string | number;
  trade_price: number;
  trade_date: string;
  deal_type: string | null;
  property_type: number;
  complex_slug: string | null;
  govt_complex_id: string | null;
}

export function parsePropertyTypeParam(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return VALID_PROPERTY_TYPES.has(parsed) ? parsed : DEFAULT_PROPERTY_TYPE;
}

export function normalizeTodayTransactionRow(
  row: TodayTransactionRow
): TodayTransaction {
  return {
    ...row,
    size_sqm: Number(row.size_sqm),
    trade_price: Number(row.trade_price),
    change_rate: row.change_rate !== null ? Number(row.change_rate) : null,
    complex_slug: row.complex_slug ?? null,
    govt_complex_id: row.govt_complex_id ?? null,
  };
}

export function normalizeNewHighTransactionRow(
  row: NewHighTransactionRow
): NewHighTransaction {
  return {
    ...row,
    size_sqm: Number(row.size_sqm),
    trade_price: Number(row.trade_price),
    complex_slug: row.complex_slug ?? null,
    govt_complex_id: row.govt_complex_id ?? null,
  };
}
