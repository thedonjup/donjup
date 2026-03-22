export interface RankItem {
  rank: number;
  apt_name: string;
  region_name: string;
  highest_price: number;
  trade_price: number;
  change_rate: number;
  size_sqm?: number;
}

export type CardType = "drop" | "high";
