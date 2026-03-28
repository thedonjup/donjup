import { testApiHandler } from 'next-test-api-route-handler'; // 반드시 첫 번째 import
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  createDbClient: vi.fn(),
  getPool: vi.fn(),
}));
vi.mock('@/lib/api/molit-rent', () => ({
  fetchRentTransactions: vi.fn(),
}));
vi.mock('@/lib/api/molit', () => ({
  delay: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/constants/region-codes', () => ({
  REGION_HIERARCHY: {
    '11': {
      shortName: '서울',
      sigungu: {
        '11110': '종로구',
      },
    },
  },
}));
vi.mock('@/lib/alert', () => ({ sendSlackAlert: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import * as appHandler from '@/app/api/cron/fetch-rents/route';
import { createDbClient } from '@/lib/db/client';
import { fetchRentTransactions } from '@/lib/api/molit-rent';

function makeMockDb() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockImplementation((resolve) =>
      resolve({ data: [], error: null, count: 0 })
    ),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn(),
    _chain: chain,
  };
}

describe('GET /api/cron/fetch-rents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('Authorization 헤더 없으면 401 반환', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
      },
    });
  });

  it('잘못된 Authorization 헤더면 401 반환', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer bad-token' },
        });
        expect(res.status).toBe(401);
      },
    });
  });

  it('정상 인증 + 빈 거래 데이터 -> success:true, totalInserted=0', async () => {
    vi.mocked(createDbClient).mockReturnValue(makeMockDb() as any);
    vi.mocked(fetchRentTransactions).mockResolvedValue([]);

    await testApiHandler({
      appHandler,
      url: '?batch=0',
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.totalInserted).toBe(0);
        expect(json.batch).toBe(0);
      },
    });
  });

  it('mock 전세 데이터 있으면 success:true 반환', async () => {
    const mockDb = makeMockDb();
    // upsert().select() 체인이 { data: [{id: 1}], error: null } 반환하도록 설정
    mockDb._chain.upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null }),
    });
    vi.mocked(createDbClient).mockReturnValue(mockDb as any);

    vi.mocked(fetchRentTransactions).mockResolvedValue([
      {
        regionCode: '11110',
        dongName: '청운동',
        aptName: '경희궁자이',
        sizeSqm: 84.99,
        floor: 5,
        deposit: 50000,
        monthlyRent: 0,
        rentType: '전세',
        contractType: '신규',
        tradeDate: '2026-01-15',
        preDeposit: null,
        preMonthlyRent: null,
        rawData: {} as any,
      },
    ]);

    await testApiHandler({
      appHandler,
      url: '?batch=0',
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.totalInserted).toBeGreaterThanOrEqual(0);
        expect(json.sidoCodes).toBeDefined();
        expect(json.dealYearMonths).toBeDefined();
      },
    });
  });
});
