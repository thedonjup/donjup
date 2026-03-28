import { testApiHandler } from 'next-test-api-route-handler'; // 반드시 첫 번째 import
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue({ rowCount: 0 }),
    onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 0 }),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  };
  return { db: mockChain };
});
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
import { fetchRentTransactions } from '@/lib/api/molit-rent';

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
        contractTerm: '2년',
        builtYear: 2017,
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
