/**
 * 가격 정규화 유틸리티 모듈
 *
 * 이상거래 판별, 이동중위가 계산, 저층 필터링, 직거래 식별을 수행하는 순수 함수 모음.
 * Plan 02 (차트 UI)에서 소비하도록 설계됨.
 */

/** 저층 기준: 3층 이하 */
export const LOW_FLOOR_MAX = 3;

/**
 * 직거래 여부 판별
 */
export function isDirectDeal(dealType: string | null): boolean {
  return dealType === "직거래";
}

/**
 * 이상거래 여부 판별
 * 직거래이면서 중위가 대비 30% 이상 저가인 경우 이상거래로 판정 (NORM-04)
 */
export function isDealSuspicious(
  tradePrice: number,
  medianPrice: number,
  dealType: string | null
): boolean {
  return isDirectDeal(dealType) && tradePrice < medianPrice * 0.70;
}

/**
 * 중위가 계산
 * 빈 배열이면 0 반환
 */
export function computeMedianPrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * 3개월 이동중위가 계산
 *
 * 각 월에 대해 해당 월 + 이전 2개월 데이터를 합산하여 중위가를 계산함.
 * isLowConfidence: 수집된 가격 데이터가 5건 미만이면 true (점선 처리 기준)
 */
export function computeMovingMedian(
  data: { month: string; prices: number[] }[]
): { month: string; median: number; count: number; isLowConfidence: boolean }[] {
  // month 오름차순으로 정렬
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const monthIndex = new Map(sorted.map((d, i) => [d.month, i]));

  return sorted.map((current, i) => {
    // 현재 월 + 이전 2개월 가격 수집
    const collectedPrices: number[] = [];
    for (let offset = 0; offset <= 2; offset++) {
      const idx = i - offset;
      if (idx >= 0) {
        collectedPrices.push(...sorted[idx].prices);
      }
    }

    const median = computeMedianPrice(collectedPrices);
    const count = collectedPrices.length;
    const isLowConfidence = count < 5;

    return {
      month: current.month,
      median,
      count,
      isLowConfidence,
    };
  });

  // monthIndex used implicitly by the sorted order
  void monthIndex;
}

/**
 * 거래 필터링
 *
 * - normal: 모든 필터를 통과한 거래 (저층 제외 조건 적용 시 저층 아닌 것, 이상거래 아닌 것, 직거래 아닌 것, 중위가 90% 이상)
 * - directDeals: 직거래이면서 이상거래(suspicious)가 아닌 거래 — 차트에 회색 점으로 표시
 * - excluded: 이상거래(직거래 + 중위가 70% 미만) 또는 중위가 90% 미만 거래 — 비표시
 *
 * CONTEXT 결정:
 * - 저층 포함/제외 토글 (기본: 제외)
 * - 중위가 90% 미만 거래는 deal_type 무관하게 제외
 * - 직거래는 회색 점으로 별도 표시 (추이선에 포함 안 함)
 */
export function filterTransactions<
  T extends { floor: number; trade_price: number; deal_type: string | null }
>(
  txns: T[],
  opts: { excludeLowFloor: boolean; recentMedian: number }
): { normal: T[]; directDeals: T[]; excluded: T[] } {
  const { excludeLowFloor, recentMedian } = opts;

  const normal: T[] = [];
  const directDeals: T[] = [];
  const excluded: T[] = [];

  for (const t of txns) {
    const isLowFloor = t.floor <= LOW_FLOOR_MAX;

    // 저층 제외 옵션 적용
    if (excludeLowFloor && isLowFloor) {
      excluded.push(t);
      continue;
    }

    // 중위가 90% 미만이면 제외 (CONTEXT 결정 1: 이중 필터)
    if (recentMedian > 0 && t.trade_price < recentMedian * 0.90) {
      excluded.push(t);
      continue;
    }

    // 직거래 처리
    if (isDirectDeal(t.deal_type)) {
      // 이상거래(직거래 + 70% 미만)는 이미 위 90% 필터에 걸렸으므로
      // 여기까지 온 직거래는 회색 점으로 표시할 거래
      directDeals.push(t);
      continue;
    }

    normal.push(t);
  }

  return { normal, directDeals, excluded };
}

/**
 * 거래 내역을 월별로 그룹화
 *
 * trade_date에서 YYYY-MM 추출, 오름차순 정렬
 */
export function groupByMonth(
  txns: { trade_date: string; trade_price: number }[]
): { month: string; prices: number[] }[] {
  const map = new Map<string, number[]>();

  for (const t of txns) {
    const month = t.trade_date.slice(0, 7); // "YYYY-MM"
    const existing = map.get(month);
    if (existing) {
      existing.push(t.trade_price);
    } else {
      map.set(month, [t.trade_price]);
    }
  }

  return Array.from(map.entries())
    .map(([month, prices]) => ({ month, prices }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
