import { testApiHandler } from 'next-test-api-route-handler'; // 반드시 첫 번째 import
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  createDbClient: vi.fn(),
  getPool: vi.fn(),
}));
vi.mock('@/lib/api/finlife', () => ({
  fetchAllMortgageProducts: vi.fn(),
  bankNameToRateType: vi.fn((name: string) => name),
}));
vi.mock('@/lib/alert', () => ({ sendSlackAlert: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import * as appHandler from '@/app/api/cron/fetch-bank-rates/route';
import { createDbClient } from '@/lib/db/client';
import { fetchAllMortgageProducts } from '@/lib/api/finlife';

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
    upsert: vi.fn().mockResolvedValue({ error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
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

describe('GET /api/cron/fetch-bank-rates', () => {
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
          headers: { Authorization: 'Bearer wrong-secret' },
        });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
      },
    });
  });

  it('FinLife 데이터 없으면 success:false 반환', async () => {
    vi.mocked(createDbClient).mockReturnValue(makeMockDb() as any);
    vi.mocked(fetchAllMortgageProducts).mockResolvedValue([]);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.errors).toBeDefined();
      },
    });
  });

  it('정상 데이터 있으면 success:true, inserted >= 1', async () => {
    vi.mocked(createDbClient).mockReturnValue(makeMockDb() as any);
    vi.mocked(fetchAllMortgageProducts).mockResolvedValue([
      {
        bankName: '국민은행',
        productName: 'KB주담대',
        rateType: '고정',
        rateMin: 3.5,
        rateMax: 5.0,
        rateAvg: 4.0,
      },
    ]);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.inserted).toBeGreaterThanOrEqual(1);
      },
    });
  });
});
