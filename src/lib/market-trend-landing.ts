import { DATA_UNAVAILABLE_MESSAGE } from "@/lib/public-api-error";

export interface MarketLandingStat {
  count: number;
  sigunguCount?: number;
  topDrop: { change_rate: number; apt_name?: string } | null;
  topHigh: { trade_price: number; apt_name?: string } | null;
}

export interface TrendTradeDateRow {
  trade_date: string | null;
}

export interface MonthlyVolume {
  month: string;
  count: number;
}

export function totalMarketCount(rows: MarketLandingStat[]): number {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

export function activeMarketRegionCount(rows: MarketLandingStat[]): number {
  return rows.filter((row) => row.count > 0).length;
}

export function totalSigunguCount(rows: MarketLandingStat[]): number {
  return rows.reduce((sum, row) => sum + (row.sigunguCount ?? 0), 0);
}

export function strongestMarketDrop(
  rows: MarketLandingStat[],
): MarketLandingStat["topDrop"] {
  const drops = rows
    .map((row) => row.topDrop)
    .filter((drop): drop is NonNullable<MarketLandingStat["topDrop"]> => drop !== null);

  if (drops.length === 0) return null;
  return drops.reduce((strongest, drop) =>
    drop.change_rate < strongest.change_rate ? drop : strongest,
  );
}

export function highestMarketHigh(
  rows: MarketLandingStat[],
): MarketLandingStat["topHigh"] {
  const highs = rows
    .map((row) => row.topHigh)
    .filter((high): high is NonNullable<MarketLandingStat["topHigh"]> => high !== null);

  if (highs.length === 0) return null;
  return highs.reduce((highest, high) =>
    high.trade_price > highest.trade_price ? high : highest,
  );
}

export function monthlyVolumeBuckets(
  rows: TrendTradeDateRow[],
  limit = 6,
): MonthlyVolume[] {
  const countMap = new Map<string, number>();

  for (const row of rows) {
    const month = String(row.trade_date ?? "").substring(0, 7);
    if (month.length === 7) {
      countMap.set(month, (countMap.get(month) ?? 0) + 1);
    }
  }

  return Array.from(countMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, limit)
    .reverse();
}

export function totalMonthlyVolume(rows: MonthlyVolume[]): number {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

export function latestMonthlyVolume(rows: MonthlyVolume[]): MonthlyVolume | null {
  return rows.at(-1) ?? null;
}

export function monthOverMonthChangeRate(rows: MonthlyVolume[]): number | null {
  if (rows.length < 2) return null;

  const current = rows[rows.length - 1].count;
  const previous = rows[rows.length - 2].count;
  if (previous <= 0) return null;

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export type MarketTrendEmptyKind = "market" | "trend-volume" | "trend-price";

export function marketTrendEmptyStateCopy(
  kind: MarketTrendEmptyKind,
  isDataUnavailable: boolean,
): {
  title: string;
  description: string;
  basisLabel: string;
} {
  if (isDataUnavailable) {
    return {
      title: "시장 데이터를 준비하는 중입니다",
      description: DATA_UNAVAILABLE_MESSAGE,
      basisLabel: "데이터 연결 확인 중",
    };
  }

  if (kind === "trend-volume") {
    return {
      title: "거래량 데이터가 없습니다",
      description: "최근 거래량을 집계할 수 있는 실거래 데이터가 아직 없습니다.",
      basisLabel: "거래량 집계 대기 중",
    };
  }

  if (kind === "trend-price") {
    return {
      title: "지역별 평균가 데이터가 없습니다",
      description: "지역별 가격 비교를 만들 수 있는 거래 데이터가 아직 없습니다.",
      basisLabel: "지역 가격 비교 대기 중",
    };
  }

  return {
    title: "지역별 거래 데이터가 없습니다",
    description: "최근 3개월 기준으로 보여줄 지역별 거래 신호가 아직 없습니다.",
    basisLabel: "최근 3개월 가격 통계 대기 중",
  };
}
