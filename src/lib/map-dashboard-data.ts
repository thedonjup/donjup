import type { MapTransaction } from "@/components/map/map-utils";
import { aptUrl } from "@/lib/apt-url";

export const MAP_TRANSACTION_LIMIT = 500;

export interface MapTransactionRow {
  id: string;
  complex_id: string;
  govt_complex_id: string | null;
  apt_name: string;
  region_code: string;
  trade_price: number | string;
  change_rate: number | string | null;
  is_new_high: boolean;
  size_sqm: number | string | null;
  trade_date: string | null;
  complex_slug: string | null;
  dong_name: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

export function normalizeMapTransactionRow(
  row: MapTransactionRow,
): MapTransaction | null {
  if (row.latitude === null || row.longitude === null) {
    return null;
  }

  return {
    id: row.id,
    complex_id: row.complex_id,
    govt_complex_id: row.govt_complex_id,
    apt_name: row.apt_name,
    region_code: row.region_code,
    dong_name: row.dong_name ?? null,
    trade_price: Number(row.trade_price),
    change_rate: row.change_rate !== null ? Number(row.change_rate) : null,
    is_new_high: row.is_new_high,
    slug: row.complex_slug ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    size_sqm: row.size_sqm !== null ? Number(row.size_sqm) : null,
    trade_date: row.trade_date,
    detail_url: aptUrl({
      govtComplexId: row.govt_complex_id,
      regionCode: row.region_code,
      slug: row.complex_slug,
    }),
  };
}

export function normalizeMapTransactionRows(
  rows: MapTransactionRow[],
): MapTransaction[] {
  return rows.flatMap((row) => {
    const normalized = normalizeMapTransactionRow(row);
    return normalized ? [normalized] : [];
  });
}
