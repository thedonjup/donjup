/**
 * 한국은행 ECOS API 래퍼
 * https://ecos.bok.or.kr/api/#/
 *
 * 통계 코드:
 * - 722Y001: 한국은행 기준금리 (아이템 0101000)
 * - 817Y002: 시장금리 (CD 91일물 010502000, 국고채 3년 010200000)
 */

const API_BASE = "https://ecos.bok.or.kr/api/StatisticSearch";

export interface EcosRateItem {
  rateType: string;
  rateValue: number;
  baseDate: string; // YYYY-MM-DD
  source: string;
}

interface EcosApiRow {
  STAT_CODE: string;
  STAT_NAME: string;
  ITEM_CODE1: string;
  ITEM_NAME1: string;
  TIME: string;
  DATA_VALUE: string;
}

interface EcosApiResponse {
  StatisticSearch?: {
    list_total_count: number;
    row: EcosApiRow[];
  };
  RESULT?: {
    CODE: string;
    MESSAGE: string;
  };
}

/**
 * ECOS API에서 최근 금리 데이터를 가져옵니다.
 */
async function fetchEcosStat(
  statCode: string,
  itemCode: string,
  cycle: string, // D=일, M=월
  startDate: string,
  endDate: string
): Promise<EcosApiRow[]> {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) throw new Error("ECOS_API_KEY 환경변수가 설정되지 않았습니다.");

  // ECOS REST URL: /api/StatisticSearch/{apiKey}/{format}/{lang}/{startCount}/{endCount}/{statCode}/{cycle}/{startDate}/{endDate}/{itemCode1}
  const url = `${API_BASE}/${apiKey}/json/kr/1/10/${statCode}/${cycle}/${startDate}/${endDate}/${itemCode}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ECOS API 호출 실패: ${res.status} ${res.statusText}`);
  }

  const data: EcosApiResponse = await res.json();

  if (data.RESULT) {
    // 데이터 없음 등 에러
    console.warn(`ECOS API: [${data.RESULT.CODE}] ${data.RESULT.MESSAGE}`);
    return [];
  }

  return data.StatisticSearch?.row ?? [];
}

/**
 * 기준금리 (722Y001, 아이템 0101000) - 월별
 */
export async function fetchBaseRate(yearMonth: string): Promise<EcosRateItem | null> {
  // yearMonth: YYYYMM
  const rows = await fetchEcosStat("722Y001", "0101000", "M", yearMonth, yearMonth);
  if (rows.length === 0) return null;

  const row = rows[rows.length - 1];
  return {
    rateType: "BASE_RATE",
    rateValue: parseFloat(row.DATA_VALUE),
    baseDate: `${row.TIME.slice(0, 4)}-${row.TIME.slice(4, 6)}-01`,
    source: "한국은행 ECOS",
  };
}

/**
 * CD 91일물 (817Y002, 아이템 010502000) - 일별
 */
export async function fetchCd91Rate(startDate: string, endDate: string): Promise<EcosRateItem | null> {
  const rows = await fetchEcosStat("817Y002", "010502000", "D", startDate, endDate);
  if (rows.length === 0) return null;

  const row = rows[rows.length - 1];
  return {
    rateType: "CD_91",
    rateValue: parseFloat(row.DATA_VALUE),
    baseDate: `${row.TIME.slice(0, 4)}-${row.TIME.slice(4, 6)}-${row.TIME.slice(6, 8)}`,
    source: "한국은행 ECOS",
  };
}

/**
 * 국고채 3년 (817Y002, 아이템 010200000) - 일별
 */
export async function fetchTreasury3yRate(startDate: string, endDate: string): Promise<EcosRateItem | null> {
  const rows = await fetchEcosStat("817Y002", "010200000", "D", startDate, endDate);
  if (rows.length === 0) return null;

  const row = rows[rows.length - 1];
  return {
    rateType: "TREASURY_3Y",
    rateValue: parseFloat(row.DATA_VALUE),
    baseDate: `${row.TIME.slice(0, 4)}-${row.TIME.slice(4, 6)}-${row.TIME.slice(6, 8)}`,
    source: "한국은행 ECOS",
  };
}

/**
 * COFIX 신규취급액 기준 (817Y002, 아이템 010503001) - 월별
 */
export async function fetchCofixNew(yearMonth: string): Promise<EcosRateItem | null> {
  const rows = await fetchEcosStat("817Y002", "010503001", "M", yearMonth, yearMonth);
  if (rows.length === 0) return null;

  const row = rows[rows.length - 1];
  return {
    rateType: "COFIX_NEW",
    rateValue: parseFloat(row.DATA_VALUE),
    baseDate: `${row.TIME.slice(0, 4)}-${row.TIME.slice(4, 6)}-01`,
    source: "한국은행 ECOS",
  };
}

/**
 * COFIX 잔액기준 (817Y002, 아이템 010503002) - 월별
 */
export async function fetchCofixBal(yearMonth: string): Promise<EcosRateItem | null> {
  const rows = await fetchEcosStat("817Y002", "010503002", "M", yearMonth, yearMonth);
  if (rows.length === 0) return null;

  const row = rows[rows.length - 1];
  return {
    rateType: "COFIX_BAL",
    rateValue: parseFloat(row.DATA_VALUE),
    baseDate: `${row.TIME.slice(0, 4)}-${row.TIME.slice(4, 6)}-01`,
    source: "한국은행 ECOS",
  };
}

/**
 * 모든 금리 지표를 한번에 수집
 */
export async function fetchAllRates(): Promise<EcosRateItem[]> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  // 이전달도 시도 (COFIX/기준금리는 월별이라 이번달 데이터 없을 수 있음)
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYearMonth = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  // 일별 데이터: 최근 7일 범위
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDate = `${weekAgo.getFullYear()}${String(weekAgo.getMonth() + 1).padStart(2, "0")}${String(weekAgo.getDate()).padStart(2, "0")}`;
  const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const results: EcosRateItem[] = [];

  // 병렬 호출
  const [baseRate, cd91, treasury3y, cofixNew, cofixBal, cofixNewPrev, cofixBalPrev, baseRatePrev] =
    await Promise.allSettled([
      fetchBaseRate(yearMonth),
      fetchCd91Rate(startDate, endDate),
      fetchTreasury3yRate(startDate, endDate),
      fetchCofixNew(yearMonth),
      fetchCofixBal(yearMonth),
      fetchCofixNew(prevYearMonth),
      fetchCofixBal(prevYearMonth),
      fetchBaseRate(prevYearMonth),
    ]);

  // 이번달 데이터 우선, 없으면 이전달
  const addResult = (current: PromiseSettledResult<EcosRateItem | null>, fallback?: PromiseSettledResult<EcosRateItem | null>) => {
    if (current.status === "fulfilled" && current.value) {
      results.push(current.value);
    } else if (fallback?.status === "fulfilled" && fallback.value) {
      results.push(fallback.value);
    }
  };

  addResult(baseRate, baseRatePrev);
  addResult(cd91);
  addResult(treasury3y);
  addResult(cofixNew, cofixNewPrev);
  addResult(cofixBal, cofixBalPrev);

  return results;
}
