import { DATA_UNAVAILABLE_MESSAGE } from "@/lib/public-api-error";

export interface SignalLandingTransaction {
  region_code: string;
  trade_date: string;
  trade_price: number;
  change_rate?: number | null;
}

export function latestTradeDate(rows: SignalLandingTransaction[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!latest || row.trade_date > latest) return row.trade_date;
    return latest;
  }, null);
}

export function uniqueRegionCount(rows: SignalLandingTransaction[]): number {
  return new Set(rows.map((row) => row.region_code).filter(Boolean)).size;
}

export function maxTradePrice(rows: SignalLandingTransaction[]): number | null {
  if (rows.length === 0) return null;
  return Math.max(...rows.map((row) => row.trade_price));
}

export function strongestDropRate(rows: SignalLandingTransaction[]): number | null {
  const drops = rows
    .map((row) => row.change_rate)
    .filter((rate): rate is number => rate !== null && rate !== undefined && rate < 0);

  if (drops.length === 0) return null;
  return Math.min(...drops);
}

export type SignalEmptyKind = "today" | "new-highs";

export function signalEmptyStateCopy(
  kind: SignalEmptyKind,
  isDataUnavailable: boolean
): {
  title: string;
  description: string;
  basisLabel: string;
} {
  if (isDataUnavailable) {
    return {
      title: "거래 데이터를 준비하는 중입니다",
      description: DATA_UNAVAILABLE_MESSAGE,
      basisLabel: "데이터 연결 확인 중",
    };
  }

  if (kind === "new-highs") {
    return {
      title: "오늘의 신고가가 없습니다",
      description: "아직 집계된 신고가 거래가 없어요. 내일 다시 확인해보세요.",
      basisLabel: "신고가 거래 집계 대기 중",
    };
  }

  return {
    title: "거래 데이터가 없습니다",
    description: "매일 자동으로 업데이트됩니다.",
    basisLabel: "최신 실거래 집계 대기 중",
  };
}
