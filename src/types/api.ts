import type { FinanceRate } from "./db";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchResult {
  id: string;
  apt_name: string;
  region_name: string;
  dong_name: string | null;
  slug: string;
  address: string | null;
  total_units: number | null;
  built_year: number | null;
  latest_price: number | null;
  latest_change: number | null;
  latest_date: string | null;
}

export interface BankRateResponse {
  rates: Pick<FinanceRate, "rate_type" | "rate_value" | "base_date">[];
  minRate: number | null;
}
