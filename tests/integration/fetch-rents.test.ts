import { testApiHandler } from 'next-test-api-route-handler'; // 반드시 첫 번째 import
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

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
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
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
import { db } from '@/lib/db';

const dbMock = db as unknown as Record<string, Mock>;

function mockRentTransaction(overrides = {}) {
  return {
    regionCode: '11110',
    dongName: 'Cheongun-dong',
    aptName: 'Cost Safe Apt',
    sizeSqm: 84.99,
    floor: 5,
    deposit: 50000,
    monthlyRent: 0,
    rentType: 'jeonse',
    contractType: 'new',
    tradeDate: '2026-01-15',
    preDeposit: null,
    preMonthlyRent: null,
    rawData: {
      aptNm: 'Cost Safe Apt',
      excluUseAr: '84.99',
      floor: '5',
      dealYear: '2026',
      dealMonth: '1',
      dealDay: '15',
      deposit: '50,000',
      monthlyRent: '0',
      umdNm: 'Cheongun-dong',
      buildYear: '2017',
      sggCd: '11110',
      contractType: 'new',
      contractTerm: '2y',
      preDeposit: '',
      preMonthlyRent: '',
    },
    contractTerm: '2y',
    builtYear: 2017,
    ...overrides,
  };
}

describe('GET /api/cron/fetch-rents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    dbMock.select.mockReturnThis();
    dbMock.from.mockReturnThis();
    dbMock.where.mockReturnThis();
    dbMock.limit.mockResolvedValue([]);
    dbMock.insert.mockReturnThis();
    dbMock.values.mockReturnThis();
    dbMock.onConflictDoNothing.mockReturnThis();
    dbMock.returning.mockResolvedValue([]);
    dbMock.execute.mockResolvedValue([]);
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
        expect(json.monthCount).toBe(1);
        expect(json.dealYearMonths).toHaveLength(1);
        expect(fetchRentTransactions).toHaveBeenCalledTimes(1);
      },
    });
  });

  it('months 파라미터로 수동 백필 범위를 넓힐 수 있음', async () => {
    vi.mocked(fetchRentTransactions).mockResolvedValue([]);

    await testApiHandler({
      appHandler,
      url: '?batch=0&months=3',
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.monthCount).toBe(3);
        expect(json.dealYearMonths).toHaveLength(3);
        expect(fetchRentTransactions).toHaveBeenCalledTimes(3);
      },
    });
  });

  it('rentTransactionId is stable and changes when rent values change', () => {
    const transaction = mockRentTransaction();
    const input = {
      regionCode: transaction.regionCode,
      dongName: transaction.dongName,
      aptName: transaction.aptName,
      sizeSqm: transaction.sizeSqm,
      floor: transaction.floor,
      deposit: transaction.deposit,
      monthlyRent: transaction.monthlyRent,
      rentType: transaction.rentType,
      contractType: transaction.contractType,
      tradeDate: transaction.tradeDate,
      preDeposit: transaction.preDeposit,
      preMonthlyRent: transaction.preMonthlyRent,
    };

    expect(appHandler.rentTransactionId(input)).toBe(appHandler.rentTransactionId(input));
    expect(appHandler.rentTransactionId({ ...input, deposit: 51000 })).not.toBe(
      appHandler.rentTransactionId(input)
    );
  });

  it('KST 기준 최근 전월세 월을 역순으로 생성', () => {
    expect(
      appHandler.getRecentRentYearMonths(
        3,
        new Date('2026-01-01T00:30:00+09:00')
      )
    ).toEqual(['202601', '202512', '202511']);
  });

  it('already-seen rent transaction ids are skipped before insert', async () => {
    const transaction = mockRentTransaction();
    const id = appHandler.rentTransactionId({
      regionCode: transaction.regionCode,
      dongName: transaction.dongName,
      aptName: transaction.aptName,
      sizeSqm: transaction.sizeSqm,
      floor: transaction.floor,
      deposit: transaction.deposit,
      monthlyRent: transaction.monthlyRent,
      rentType: transaction.rentType,
      contractType: transaction.contractType,
      tradeDate: transaction.tradeDate,
      preDeposit: transaction.preDeposit,
      preMonthlyRent: transaction.preMonthlyRent,
    });

    vi.mocked(fetchRentTransactions).mockResolvedValue([transaction]);
    dbMock.limit.mockResolvedValueOnce([{ id }]);

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
        expect(json.totalInserted).toBe(0);
        expect(dbMock.insert).not.toHaveBeenCalled();
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
        rawData: {
          aptNm: 'test-apt',
          excluUseAr: '84.99',
          floor: '5',
          dealYear: '2026',
          dealMonth: '1',
          dealDay: '15',
          deposit: '50,000',
          monthlyRent: '0',
          umdNm: 'test-dong',
          buildYear: '2017',
          sggCd: '11110',
          contractType: 'new',
          contractTerm: '2y',
          preDeposit: '',
          preMonthlyRent: '',
        },
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

  it('skips external rent fetches when the database is unavailable', async () => {
    const error = new Error('query failed');
    Object.defineProperty(error, 'cause', {
      value: {
        code: '53300',
        message: 'This cluster has reached its Request Unit limit for the month and is now disabled.',
      },
    });
    dbMock.execute.mockRejectedValueOnce(error);

    await testApiHandler({
      appHandler,
      url: '?batch=0',
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json).toMatchObject({
          success: false,
          skipped: true,
          code: 'DB_UNAVAILABLE',
        });
        expect(fetchRentTransactions).not.toHaveBeenCalled();
      },
    });
  });

  it('rejects invalid batch before database and external rent fetch work', async () => {
    await testApiHandler({
      appHandler,
      url: '?batch=999',
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json).toEqual({
          success: false,
          error: 'Invalid batch parameter',
        });
        expect(dbMock.execute).not.toHaveBeenCalled();
        expect(fetchRentTransactions).not.toHaveBeenCalled();
      },
    });
  });
});
