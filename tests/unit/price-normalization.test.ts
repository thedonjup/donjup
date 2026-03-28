import { describe, it, expect } from 'vitest';
import {
  adjustFloorPrice,
  isDirectDeal,
  isDealSuspicious,
  computeMedianPrice,
  computeMovingMedian,
  filterTransactions,
  groupByMonth,
  LOW_FLOOR_MAX,
  FLOOR_ADJUSTMENT_FACTORS,
} from '@/lib/price-normalization';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
describe('Constants', () => {
  it('LOW_FLOOR_MAX is 3', () => {
    expect(LOW_FLOOR_MAX).toBe(3);
  });

  it('FLOOR_ADJUSTMENT_FACTORS has keys 1, 2, 3', () => {
    expect(FLOOR_ADJUSTMENT_FACTORS).toHaveProperty('1');
    expect(FLOOR_ADJUSTMENT_FACTORS).toHaveProperty('2');
    expect(FLOOR_ADJUSTMENT_FACTORS).toHaveProperty('3');
  });

  it('FLOOR_ADJUSTMENT_FACTORS[1] is 1.1494', () => {
    expect(FLOOR_ADJUSTMENT_FACTORS[1]).toBe(1.1494);
  });

  it('FLOOR_ADJUSTMENT_FACTORS[2] is 1.1111', () => {
    expect(FLOOR_ADJUSTMENT_FACTORS[2]).toBe(1.1111);
  });

  it('FLOOR_ADJUSTMENT_FACTORS[3] is 1.0417', () => {
    expect(FLOOR_ADJUSTMENT_FACTORS[3]).toBe(1.0417);
  });
});

// ──────────────────────────────────────────────
// adjustFloorPrice
// ──────────────────────────────────────────────
describe('adjustFloorPrice', () => {
  it('1층 거래: Math.round(10000 * 1.1494) = 11494', () => {
    expect(adjustFloorPrice(10000, 1)).toBe(11494);
  });

  it('2층 거래: Math.round(10000 * 1.1111) = 11111', () => {
    expect(adjustFloorPrice(10000, 2)).toBe(11111);
  });

  it('3층 거래: Math.round(10000 * 1.0417) = 10417', () => {
    expect(adjustFloorPrice(10000, 3)).toBe(10417);
  });

  it('4층 이상은 환산 없이 원가 반환', () => {
    expect(adjustFloorPrice(10000, 4)).toBe(10000);
  });

  it('0층 이하도 환산 없이 원가 반환', () => {
    expect(adjustFloorPrice(10000, 0)).toBe(10000);
  });

  it('5층 이상도 원가 반환', () => {
    expect(adjustFloorPrice(10000, 10)).toBe(10000);
  });
});

// ──────────────────────────────────────────────
// isDirectDeal
// ──────────────────────────────────────────────
describe('isDirectDeal', () => {
  it('"직거래" -> true', () => {
    expect(isDirectDeal('직거래')).toBe(true);
  });

  it('null -> false', () => {
    expect(isDirectDeal(null)).toBe(false);
  });

  it('"중개거래" -> false', () => {
    expect(isDirectDeal('중개거래')).toBe(false);
  });

  it('"" (빈 문자열) -> false', () => {
    expect(isDirectDeal('')).toBe(false);
  });
});

// ──────────────────────────────────────────────
// isDealSuspicious
// ──────────────────────────────────────────────
describe('isDealSuspicious', () => {
  it('직거래 + 중위가 70% 미만 -> true', () => {
    expect(isDealSuspicious(6000, 10000, '직거래')).toBe(true);
  });

  it('직거래 + 중위가 70% 이상 -> false', () => {
    expect(isDealSuspicious(8000, 10000, '직거래')).toBe(false);
  });

  it('비직거래 + 중위가 70% 미만 -> false', () => {
    expect(isDealSuspicious(6000, 10000, null)).toBe(false);
  });

  it('비직거래 + 중위가 70% 미만 (중개거래) -> false', () => {
    expect(isDealSuspicious(6000, 10000, '중개거래')).toBe(false);
  });

  it('직거래 + 정확히 70% (경계값) -> false', () => {
    // 7000 < 10000 * 0.70 = 7000 => 7000 < 7000 is false
    expect(isDealSuspicious(7000, 10000, '직거래')).toBe(false);
  });
});

// ──────────────────────────────────────────────
// computeMedianPrice
// ──────────────────────────────────────────────
describe('computeMedianPrice', () => {
  it('빈 배열 -> 0', () => {
    expect(computeMedianPrice([])).toBe(0);
  });

  it('홀수 개 [1,2,3] -> 2', () => {
    expect(computeMedianPrice([1, 2, 3])).toBe(2);
  });

  it('짝수 개 [1,2,3,4] -> 2.5', () => {
    expect(computeMedianPrice([1, 2, 3, 4])).toBe(2.5);
  });

  it('단일 요소 [5] -> 5', () => {
    expect(computeMedianPrice([5])).toBe(5);
  });

  it('정렬되지 않은 [3,1,2] -> 2', () => {
    expect(computeMedianPrice([3, 1, 2])).toBe(2);
  });
});

// ──────────────────────────────────────────────
// computeMovingMedian
// ──────────────────────────────────────────────
describe('computeMovingMedian', () => {
  it('1개월 데이터: 해당 월 가격만으로 계산', () => {
    const input = [{ month: '2024-01', prices: [10000, 12000, 11000] }];
    const result = computeMovingMedian(input);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-01');
    expect(result[0].median).toBe(11000);
    expect(result[0].count).toBe(3);
  });

  it('3개월 데이터: 세 번째 월은 3개월 합산 중위가', () => {
    const input = [
      { month: '2024-01', prices: [10000] },
      { month: '2024-02', prices: [12000] },
      { month: '2024-03', prices: [11000] },
    ];
    const result = computeMovingMedian(input);
    expect(result[2].month).toBe('2024-03');
    // prices from all 3 months: [10000, 12000, 11000] sorted => [10000, 11000, 12000]
    expect(result[2].median).toBe(11000);
    expect(result[2].count).toBe(3);
  });

  it('isLowConfidence: count < 5이면 true', () => {
    const input = [{ month: '2024-01', prices: [10000, 11000, 12000, 9000] }];
    const result = computeMovingMedian(input);
    expect(result[0].count).toBe(4);
    expect(result[0].isLowConfidence).toBe(true);
  });

  it('isLowConfidence: count >= 5이면 false', () => {
    const input = [{ month: '2024-01', prices: [10000, 11000, 12000, 9000, 10500] }];
    const result = computeMovingMedian(input);
    expect(result[0].count).toBe(5);
    expect(result[0].isLowConfidence).toBe(false);
  });

  it('입력이 정렬되지 않아도 월 오름차순 정렬하여 처리', () => {
    const input = [
      { month: '2024-03', prices: [11000] },
      { month: '2024-01', prices: [10000] },
      { month: '2024-02', prices: [12000] },
    ];
    const result = computeMovingMedian(input);
    expect(result[0].month).toBe('2024-01');
    expect(result[1].month).toBe('2024-02');
    expect(result[2].month).toBe('2024-03');
  });
});

// ──────────────────────────────────────────────
// filterTransactions
// ──────────────────────────────────────────────
describe('filterTransactions', () => {
  const makeTxn = (floor: number, trade_price: number, deal_type: string | null = null) => ({
    floor,
    trade_price,
    deal_type,
  });

  describe('lowFloorMode=adjust', () => {
    it('저층 거래(1층)를 고층 환산가로 변환 후 normal에 포함', () => {
      const txns = [makeTxn(1, 10000)];
      const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 9000 });
      expect(result.normal).toHaveLength(1);
      // 1층 환산: Math.round(10000 * 1.1494) = 11494
      expect(result.normal[0].trade_price).toBe(11494);
      expect(result.normal[0].original_price).toBe(10000);
      expect(result.excluded).toHaveLength(0);
    });

    it('adjust 모드에서 환산 후 중위가 90% 미만이면 excluded (원본 push)', () => {
      // 1층 거래 1000, 환산 후 1149 < 9000 * 0.90 = 8100 => excluded
      const txns = [makeTxn(1, 1000)];
      const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 9000 });
      expect(result.excluded).toHaveLength(1);
      expect(result.excluded[0].trade_price).toBe(1000); // 원본 push
      expect(result.normal).toHaveLength(0);
    });

    it('adjust 모드에서 직거래 저층은 directDeals로 분류', () => {
      const txns = [makeTxn(2, 10000, '직거래')];
      const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 9000 });
      expect(result.directDeals).toHaveLength(1);
      // 2층 환산: Math.round(10000 * 1.1111) = 11111
      expect(result.directDeals[0].trade_price).toBe(11111);
      expect(result.normal).toHaveLength(0);
    });
  });

  describe('lowFloorMode=exclude', () => {
    it('저층 거래는 excluded로 분류', () => {
      const txns = [makeTxn(1, 10000), makeTxn(2, 11000), makeTxn(5, 12000)];
      const result = filterTransactions(txns, { lowFloorMode: 'exclude', recentMedian: 9000 });
      expect(result.excluded).toHaveLength(2); // 1층, 2층
      expect(result.normal).toHaveLength(1); // 5층
      expect(result.normal[0].trade_price).toBe(12000);
    });
  });

  describe('lowFloorMode=include', () => {
    it('저층 거래를 원가 그대로 normal에 포함', () => {
      const txns = [makeTxn(1, 10000)];
      const result = filterTransactions(txns, { lowFloorMode: 'include', recentMedian: 9000 });
      expect(result.normal).toHaveLength(1);
      expect(result.normal[0].trade_price).toBe(10000);
    });
  });

  describe('공통 필터', () => {
    it('중위가 90% 미만 거래는 excluded', () => {
      // trade_price=7000, recentMedian=9000 => 7000 < 8100 => excluded
      const txns = [makeTxn(5, 7000)];
      const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 9000 });
      expect(result.excluded).toHaveLength(1);
      expect(result.normal).toHaveLength(0);
    });

    it('직거래는 directDeals로 분류', () => {
      const txns = [makeTxn(5, 10000, '직거래')];
      const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 9000 });
      expect(result.directDeals).toHaveLength(1);
      expect(result.normal).toHaveLength(0);
    });

    it('recentMedian=0이면 90% 필터 적용 안 함', () => {
      const txns = [makeTxn(5, 100)];
      const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 0 });
      expect(result.normal).toHaveLength(1);
    });
  });
});

// ──────────────────────────────────────────────
// groupByMonth
// ──────────────────────────────────────────────
describe('groupByMonth', () => {
  it('빈 배열 -> 빈 배열', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('거래를 YYYY-MM으로 그룹화', () => {
    const txns = [
      { trade_date: '2024-01-15', trade_price: 10000 },
      { trade_date: '2024-01-20', trade_price: 11000 },
      { trade_date: '2024-02-10', trade_price: 12000 },
    ];
    const result = groupByMonth(txns);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2024-01');
    expect(result[0].prices).toEqual([10000, 11000]);
    expect(result[1].month).toBe('2024-02');
    expect(result[1].prices).toEqual([12000]);
  });

  it('월 오름차순 정렬', () => {
    const txns = [
      { trade_date: '2024-03-01', trade_price: 13000 },
      { trade_date: '2024-01-01', trade_price: 10000 },
      { trade_date: '2024-02-01', trade_price: 11000 },
    ];
    const result = groupByMonth(txns);
    expect(result[0].month).toBe('2024-01');
    expect(result[1].month).toBe('2024-02');
    expect(result[2].month).toBe('2024-03');
  });

  it('단일 거래 -> 단일 그룹', () => {
    const txns = [{ trade_date: '2024-06-15', trade_price: 50000 }];
    const result = groupByMonth(txns);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-06');
    expect(result[0].prices).toEqual([50000]);
  });
});
