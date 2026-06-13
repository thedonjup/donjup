import { DATA_UNAVAILABLE_MESSAGE } from "@/lib/public-api-error";

export interface RateLandingItem {
  rate_value: number;
  change_bp: number | null;
  base_date: string;
}

export interface RentLandingItem {
  region_code: string;
  trade_date: string | null;
  deposit: number | string | null;
  monthly_rent: number | string | null;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function averageRateValue(rows: RateLandingItem[]): number | null {
  if (rows.length === 0) return null;
  const average = rows.reduce((sum, row) => sum + row.rate_value, 0) / rows.length;
  return Number(average.toFixed(2));
}

export function rateValueRange(rows: RateLandingItem[]): { min: number; max: number } | null {
  if (rows.length === 0) return null;
  return {
    min: Math.min(...rows.map((row) => row.rate_value)),
    max: Math.max(...rows.map((row) => row.rate_value)),
  };
}

export function averageChangeBp(rows: RateLandingItem[]): number | null {
  const changes = rows
    .map((row) => row.change_bp)
    .filter((change): change is number => change !== null);

  if (changes.length === 0) return null;
  return Math.round(changes.reduce((sum, change) => sum + change, 0) / changes.length);
}

export function latestBaseDate(rows: RateLandingItem[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!latest || row.base_date > latest) return row.base_date;
    return latest;
  }, null);
}

export function latestRentTradeDate(rows: RentLandingItem[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!row.trade_date) return latest;
    if (!latest || row.trade_date > latest) return row.trade_date;
    return latest;
  }, null);
}

export function maxRentDeposit(rows: RentLandingItem[]): number | null {
  const deposits = rows
    .map((row) => toNumber(row.deposit))
    .filter((deposit): deposit is number => deposit !== null);

  if (deposits.length === 0) return null;
  return Math.max(...deposits);
}

export function maxMonthlyRent(rows: RentLandingItem[]): number | null {
  const rents = rows
    .map((row) => toNumber(row.monthly_rent))
    .filter((rent): rent is number => rent !== null);

  if (rents.length === 0) return null;
  return Math.max(...rents);
}

export function uniqueRentRegionCount(rows: RentLandingItem[]): number {
  return new Set(rows.map((row) => row.region_code).filter(Boolean)).size;
}

export type RateRentEmptyKind = "rate" | "rent" | "jeonse" | "wolse";

export function rateRentEmptyStateCopy(
  kind: RateRentEmptyKind,
  isDataUnavailable: boolean,
): {
  title: string;
  description: string;
  basisLabel: string;
} {
  if (isDataUnavailable) {
    return {
      title: "금리·전월세 데이터를 준비하는 중입니다",
      description: DATA_UNAVAILABLE_MESSAGE,
      basisLabel: "데이터 연결 확인 중",
    };
  }

  if (kind === "rate") {
    return {
      title: "수집된 금리 데이터가 없습니다",
      description: "금리 수집이 완료되면 기준금리, COFIX, 은행별 주담대 금리를 보여줍니다.",
      basisLabel: "금리 데이터 집계 대기 중",
    };
  }

  if (kind === "jeonse") {
    return {
      title: "전세 거래 데이터가 없습니다",
      description: "해당 지역의 전세 거래가 집계되면 보증금 순위가 표시됩니다.",
      basisLabel: "전세 거래 집계 대기 중",
    };
  }

  if (kind === "wolse") {
    return {
      title: "월세 거래 데이터가 없습니다",
      description: "해당 지역의 월세 거래가 집계되면 최근 월세 흐름이 표시됩니다.",
      basisLabel: "월세 거래 집계 대기 중",
    };
  }

  return {
    title: "전월세 거래 데이터가 없습니다",
    description: "전월세 실거래 수집이 완료되면 전세와 월세 흐름을 함께 보여줍니다.",
    basisLabel: "전월세 거래 집계 대기 중",
  };
}
