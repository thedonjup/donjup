import { testApiHandler } from 'next-test-api-route-handler'; // 반드시 첫 번째 import
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue({ rowCount: 0 }),
    onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 0 }),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  };
  // make select chain return empty array when awaited
  mockChain.limit = vi.fn().mockResolvedValue([]);
  mockChain.where = vi.fn().mockReturnValue({ ...mockChain, limit: vi.fn().mockResolvedValue([]) });
  return { db: mockChain };
});
vi.mock('@/lib/api/molit', () => ({
  fetchTransactions: vi.fn(),
  delay: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/api/molit-multi', () => ({
  fetchMultiTransactions: vi.fn(),
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
vi.mock('@/lib/constants/property-types', () => ({
  PROPERTY_TYPES: { APT: 1, VILLA: 2, OFFICETEL: 3, LAND: 4, COMMERCIAL: 5 },
  PROPERTY_TYPE_LABELS: { 1: '아파트', 2: '연립다세대', 3: '오피스텔' },
}));
vi.mock('@/lib/alert', () => ({ sendSlackAlert: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import * as appHandler from '@/app/api/cron/fetch-transactions/route';
import { fetchTransactions } from '@/lib/api/molit';

describe('GET /api/cron/fetch-transactions', () => {
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
    vi.mocked(fetchTransactions).mockResolvedValue([]);

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

  it('mock 매매 데이터 있으면 success:true, 응답 구조 검증', async () => {
    vi.mocked(fetchTransactions).mockResolvedValue([
      {
        regionCode: '11110',
        dongName: '청운동',
        aptName: '경희궁자이',
        sizeSqm: 84.99,
        floor: 5,
        tradePrice: 120000,
        tradeDate: '2026-01-15',
        builtYear: 2017,
        dealType: '',
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
        expect(typeof json.totalInserted).toBe('number');
        expect(json.sidoCodes).toBeDefined();
        expect(json.dealYearMonths).toBeDefined();
        expect(json.regionsProcessed).toBeGreaterThan(0);
      },
    });
  });
});
