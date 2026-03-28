import { describe, it, expect, vi, beforeEach } from 'vitest';

// DB 모듈 mock — vi.mock은 Vitest가 자동 hoist
vi.mock('@/lib/db/client', () => ({
  getPool: vi.fn(),
}));

import { computeClusterIndex } from '@/lib/cluster-index';
import { getPool } from '@/lib/db/client';

// 헬퍼: mock pool 설정
function mockPoolQuery(
  rows: Array<{
    trade_date: string;
    trade_price: number | string;
    floor: number | string;
    deal_type: string | null;
  }>
) {
  const mockQuery = vi.fn().mockResolvedValue({ rows });
  vi.mocked(getPool).mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);
  return mockQuery;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// 빈 입력
// ──────────────────────────────────────────────
describe('computeClusterIndex — 빈 입력', () => {
  it('regionCodes=[] 이면 즉시 [] 반환하고 DB를 호출하지 않는다', async () => {
    const mockQuery = mockPoolQuery([]);

    const result = await computeClusterIndex([]);

    expect(result).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// 정상 데이터 (3개월, 각 3건)
// ──────────────────────────────────────────────
describe('computeClusterIndex — 정상 데이터 3개월', () => {
  it('기준월(2024-01) index=100, 이후 월은 중위가 비율에 따라 계산된다', async () => {
    // 2024-01: [10000, 10000, 10000] => median=10000
    // 2024-02: [12000, 12000, 12000] => median=12000 => index=120
    // 2024-03: [15000, 15000, 15000] => median=15000 => index=150
    const rows = [
      { trade_date: '2024-01-05', trade_price: 10000, floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: 10000, floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: 10000, floor: 7, deal_type: null },
      { trade_date: '2024-02-05', trade_price: 12000, floor: 5, deal_type: null },
      { trade_date: '2024-02-10', trade_price: 12000, floor: 6, deal_type: null },
      { trade_date: '2024-02-15', trade_price: 12000, floor: 7, deal_type: null },
      { trade_date: '2024-03-05', trade_price: 15000, floor: 5, deal_type: null },
      { trade_date: '2024-03-10', trade_price: 15000, floor: 6, deal_type: null },
      { trade_date: '2024-03-15', trade_price: 15000, floor: 7, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    expect(result).toHaveLength(3);
    expect(result[0].month).toBe('2024-01');
    expect(result[0].index).toBe(100);
    expect(result[0].medianPrice).toBe(10000);
    expect(result[0].count).toBe(3);

    expect(result[1].month).toBe('2024-02');
    expect(result[1].index).toBe(120);
    expect(result[1].medianPrice).toBe(12000);

    expect(result[2].month).toBe('2024-03');
    expect(result[2].index).toBe(150);
    expect(result[2].medianPrice).toBe(15000);
  });

  it('반환 배열의 각 요소에 month, index, medianPrice, count 필드가 존재한다', async () => {
    const rows = [
      { trade_date: '2024-01-05', trade_price: 10000, floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: 10000, floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: 10000, floor: 7, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('month');
    expect(result[0]).toHaveProperty('index');
    expect(result[0]).toHaveProperty('medianPrice');
    expect(result[0]).toHaveProperty('count');
  });

  it('trade_price가 string으로 반환되어도 Number()로 변환되어 정상 계산된다', async () => {
    const rows = [
      { trade_date: '2024-01-05', trade_price: '10000', floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: '10000', floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: '10000', floor: 7, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    expect(result).toHaveLength(1);
    expect(result[0].medianPrice).toBe(10000);
    expect(result[0].index).toBe(100);
  });
});

// ──────────────────────────────────────────────
// 직거래 필터링
// ──────────────────────────────────────────────
describe('computeClusterIndex — 직거래 필터링', () => {
  it('deal_type=직거래인 행은 지수 계산에서 제외된다', async () => {
    // 2024-01: 직거래 3건 + 일반 3건(20000) => median of [20000,20000,20000]=20000
    const rows = [
      { trade_date: '2024-01-05', trade_price: 5000, floor: 5, deal_type: '직거래' },
      { trade_date: '2024-01-06', trade_price: 5000, floor: 5, deal_type: '직거래' },
      { trade_date: '2024-01-07', trade_price: 5000, floor: 5, deal_type: '직거래' },
      { trade_date: '2024-01-10', trade_price: 20000, floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: 20000, floor: 7, deal_type: null },
      { trade_date: '2024-01-20', trade_price: 20000, floor: 8, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    // 직거래 3건 제외되고 일반 3건만 남으므로 medianPrice는 20000
    expect(result).toHaveLength(1);
    expect(result[0].medianPrice).toBe(20000);
    expect(result[0].count).toBe(3);
  });

  it('직거래만 있는 월은 minTransactions 미달로 결과에서 제외된다', async () => {
    // 2024-01: 직거래 3건만 => 필터 후 0건 => skip
    // 2024-02: 일반 3건 => 기준월이 되어야 함
    const rows = [
      { trade_date: '2024-01-05', trade_price: 5000, floor: 5, deal_type: '직거래' },
      { trade_date: '2024-01-06', trade_price: 5000, floor: 5, deal_type: '직거래' },
      { trade_date: '2024-01-07', trade_price: 5000, floor: 5, deal_type: '직거래' },
      { trade_date: '2024-02-05', trade_price: 10000, floor: 6, deal_type: null },
      { trade_date: '2024-02-10', trade_price: 10000, floor: 7, deal_type: null },
      { trade_date: '2024-02-15', trade_price: 10000, floor: 8, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-02');
    expect(result[0].index).toBe(100);
  });
});

// ──────────────────────────────────────────────
// minTransactions 미달
// ──────────────────────────────────────────────
describe('computeClusterIndex — minTransactions 미달', () => {
  it('거래 1건만 있는 월은 결과에서 제외된다 (default minTransactions=3)', async () => {
    // 2024-01: 3건 (기준월)
    // 2024-02: 1건만 => skip
    const rows = [
      { trade_date: '2024-01-05', trade_price: 10000, floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: 10000, floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: 10000, floor: 7, deal_type: null },
      { trade_date: '2024-02-05', trade_price: 12000, floor: 5, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-01');
  });

  it('모든 월이 minTransactions 미달이면 [] 반환한다', async () => {
    // 2024-01: 2건, 2024-02: 1건 => 모두 기준월 될 수 없음 => []
    const rows = [
      { trade_date: '2024-01-05', trade_price: 10000, floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: 10000, floor: 6, deal_type: null },
      { trade_date: '2024-02-05', trade_price: 12000, floor: 5, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    expect(result).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// 기준월 중위가가 0
// ──────────────────────────────────────────────
describe('computeClusterIndex — 기준월 중위가가 0', () => {
  it('모든 가격이 0이면 baseMedian=0 guard로 [] 반환한다', async () => {
    const rows = [
      { trade_date: '2024-01-05', trade_price: 0, floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: 0, floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: 0, floor: 7, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110']);

    expect(result).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// 커스텀 minTransactions
// ──────────────────────────────────────────────
describe('computeClusterIndex — 커스텀 minTransactions', () => {
  it('minTransactions=1로 설정하면 1건인 월도 포함된다', async () => {
    const rows = [
      { trade_date: '2024-01-05', trade_price: 10000, floor: 5, deal_type: null },
      { trade_date: '2024-02-05', trade_price: 12000, floor: 5, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110'], 1);

    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2024-01');
    expect(result[0].index).toBe(100);
    expect(result[1].month).toBe('2024-02');
    expect(result[1].index).toBe(120);
  });

  it('minTransactions=5로 설정하면 5건 미만인 월은 제외된다', async () => {
    // 4건인 월은 skip
    const rows = [
      { trade_date: '2024-01-05', trade_price: 10000, floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: 10000, floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: 10000, floor: 7, deal_type: null },
      { trade_date: '2024-01-20', trade_price: 10000, floor: 8, deal_type: null },
    ];
    mockPoolQuery(rows);

    const result = await computeClusterIndex(['11110'], 5);

    expect(result).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// 여러 regionCodes
// ──────────────────────────────────────────────
describe('computeClusterIndex — 여러 regionCodes', () => {
  it('여러 regionCodes를 넘기면 DB query가 한 번 호출된다', async () => {
    const rows = [
      { trade_date: '2024-01-05', trade_price: 10000, floor: 5, deal_type: null },
      { trade_date: '2024-01-10', trade_price: 10000, floor: 6, deal_type: null },
      { trade_date: '2024-01-15', trade_price: 10000, floor: 7, deal_type: null },
    ];
    const mockQuery = mockPoolQuery(rows);

    await computeClusterIndex(['11110', '22220', '33330']);

    expect(mockQuery).toHaveBeenCalledOnce();
  });
});
