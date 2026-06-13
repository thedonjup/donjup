import type { FinanceRate } from "@/types/db";

export const RATE_DASHBOARD_QUERY_LIMIT = 160;

export interface RateDashboardRateRow {
  id: string;
  rate_type: string;
  rate_value: string | number;
  prev_value: string | number | null;
  change_bp: number | null;
  base_date: string;
  source: string;
  created_at: Date | string | null;
}

export function normalizeFinanceRateRow(row: RateDashboardRateRow): FinanceRate {
  return {
    ...row,
    rate_value: Number(row.rate_value),
    prev_value: row.prev_value !== null ? Number(row.prev_value) : null,
    base_date: String(row.base_date),
    created_at: row.created_at ? String(row.created_at) : "",
  };
}

export function isDisplayBankRateType(rateType: string): boolean {
  return rateType.startsWith("BANK_") && rateType !== "BANK_PRODUCTS_ALL";
}
