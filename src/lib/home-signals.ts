export interface HomeSignalTransaction {
  apt_name: string;
  region_code: string;
  change_rate?: number | null;
  trade_price: number;
}

export interface HomeSignalRate {
  rate_type: string;
  rate_value: number | string;
  change_bp: number | null;
}

export function homeSignalHeadline({
  heroTx,
  heroHigh,
  latestTx,
}: {
  heroTx: HomeSignalTransaction | null;
  heroHigh: HomeSignalTransaction | null;
  latestTx: HomeSignalTransaction | null;
}): string {
  if (heroTx) {
    return `${heroTx.apt_name} ${Math.abs(heroTx.change_rate ?? 0)}% 하락 포착`;
  }
  if (heroHigh) {
    return `${heroHigh.apt_name} 신고가 경신`;
  }
  if (latestTx) {
    return `${latestTx.apt_name} 최신 거래 업데이트`;
  }
  return "오늘의 거래 신호를 준비 중입니다";
}

export function formatHomeRate(rate: HomeSignalRate | null): string {
  if (!rate) return "-";
  const value =
    typeof rate.rate_value === "number" ? rate.rate_value.toFixed(2) : rate.rate_value;
  return `${value}%`;
}

export function formatHomeRateChange(rate: HomeSignalRate | null): string {
  if (!rate || rate.change_bp === null || rate.change_bp === 0) return "변동 없음";
  return `${rate.change_bp > 0 ? "상승" : "하락"} ${Math.abs(rate.change_bp)}bp`;
}
