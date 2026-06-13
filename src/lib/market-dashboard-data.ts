import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

export interface MarketSidoStat {
  code: string;
  name: string;
  shortName: string;
  slug: string;
  sigunguCount: number;
  count: number;
  topDrop: { apt_name: string; change_rate: number; trade_price: number } | null;
  topHigh: { apt_name: string; trade_price: number } | null;
  medianPrice: number;
  avgPrice: number;
}

export interface MarketSigunguStat {
  code: string;
  name: string;
  count: number;
  topDrop: { apt_name: string; change_rate: number; trade_price: number } | null;
  topHigh: { apt_name: string; trade_price: number } | null;
  medianPrice: number;
  avgPrice: number;
}

export interface MarketSigunguTransaction {
  id: string;
  apt_name: string;
  size_sqm: number;
  floor: number | null;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  region_code: string;
  region_name?: string;
  deal_type?: string | null;
  drop_level?: string;
}

export interface MarketSigunguTransactions {
  drops: MarketSigunguTransaction[];
  highs: MarketSigunguTransaction[];
  recent: MarketSigunguTransaction[];
  totalCount: number;
}

export function getMarketSidoEntries() {
  return Object.entries(REGION_HIERARCHY);
}

export function createMarketStatsCutoffDate(now = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 3);
  return cutoff.toISOString().split("T")[0];
}
