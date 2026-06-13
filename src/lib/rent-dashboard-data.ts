import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

export const RENT_DASHBOARD_LIMIT = 20;

export interface RentDashboardRow {
  apt_name: string;
  region_code: string;
  region_name: string;
  size_sqm: number | string | null;
  floor: number | null;
  deposit: number | string | null;
  monthly_rent: number | string | null;
  rent_type: string | null;
  contract_type: string | null;
  trade_date: string | null;
  complex_slug: string | null;
  govt_complex_id: string | null;
}

export interface RentDashboardData {
  jeonseItems: RentDashboardRow[];
  wolseItems: RentDashboardRow[];
}

const SLUG_TO_CODES: Record<string, string[]> = Object.values(REGION_HIERARCHY)
  .reduce((acc, sido) => {
    acc[sido.slug] = Object.keys(sido.sigungu);
    return acc;
  }, {} as Record<string, string[]>);

export function getRentRegionCodes(sidoFilter?: string): string[] | undefined {
  return sidoFilter ? SLUG_TO_CODES[sidoFilter] : undefined;
}

export function getRentSidoFilters(): Array<{
  slug: string;
  shortName: string;
}> {
  return Object.values(REGION_HIERARCHY).map((sido) => ({
    slug: sido.slug,
    shortName: sido.shortName,
  }));
}

export function normalizeRentDashboardRow(row: RentDashboardRow): RentDashboardRow {
  return {
    ...row,
    complex_slug: row.complex_slug ?? null,
    govt_complex_id: row.govt_complex_id ?? null,
  };
}
