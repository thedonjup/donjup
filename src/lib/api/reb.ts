/**
 * 한국부동산원 부동산통계 API 래퍼
 * https://www.reb.or.kr/r-one/openapi
 *
 * 주요 엔드포인트:
 * - 매매가격지수: /getSidoAptTradeIndex
 * - 전세가격지수: /getSidoAptJeonseIndex
 * - 미분양현황: /getUnsoldStatus
 *
 * TODO: 실제 API 응답 형식에 따라 파싱 로직 검증 필요
 */

const API_BASE = "https://www.reb.or.kr/r-one/openapi";

/** 17개 시/도 목록 */
export const SIDO_LIST = [
  "서울", "부산", "대구", "인천", "광주",
  "대전", "울산", "세종", "경기", "강원",
  "충북", "충남", "전북", "전남", "경북",
  "경남", "제주",
] as const;

export type Sido = (typeof SIDO_LIST)[number];

export interface RebIndexItem {
  indexType: "apt_trade" | "apt_jeonse";
  regionName: string;
  indexValue: number;
  baseDate: string; // YYYY-MM-DD (월 데이터이므로 1일 기준)
  prevValue: number | null;
  changeRate: number | null;
}

interface RebApiRow {
  REGION_NM?: string;
  INDEX_VALUE?: string;
  BASE_DATE?: string;
  PREV_VALUE?: string;
  CHANGE_RATE?: string;
}

/**
 * 한국부동산원 API에서 시도별 아파트 가격지수를 가져옵니다.
 *
 * TODO: 실제 API 응답 구조에 맞게 파싱 로직 검증 필요.
 *       현재는 XML 응답 기반으로 작성됨 (data.go.kr 패턴).
 */
async function fetchRebIndex(
  endpoint: string,
  sido: string,
  startDate: string,
  endDate: string
): Promise<RebApiRow[]> {
  const apiKey = process.env.REB_API_KEY;
  if (!apiKey) throw new Error("REB_API_KEY 환경변수가 설정되지 않았습니다.");

  const params = new URLSearchParams({
    serviceKey: apiKey,
    sido,
    startDate,
    endDate,
    numOfRows: "100",
    pageNo: "1",
  });

  const url = `${API_BASE}/${endpoint}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DonJup/1.0" },
  });
  if (!res.ok) {
    throw new Error(`한국부동산원 API 호출 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  return parseXmlItems(text);
}

/**
 * XML 응답에서 <item> 목록을 파싱합니다.
 * TODO: 실제 API 응답의 태그명에 맞게 조정 필요
 */
function parseXmlItems(xml: string): RebApiRow[] {
  // 에러 체크
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    const resultMsg = extractTag(xml, "resultMsg");
    console.error(`한국부동산원 API 에러: [${resultCode}] ${resultMsg}`);
    return [];
  }

  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return [];

  return itemMatches.map((itemXml) => ({
    REGION_NM: extractTag(itemXml, "REGION_NM")?.trim() ?? undefined,
    INDEX_VALUE: extractTag(itemXml, "INDEX_VALUE")?.trim() ?? undefined,
    BASE_DATE: extractTag(itemXml, "BASE_DATE")?.trim() ?? undefined,
    PREV_VALUE: extractTag(itemXml, "PREV_VALUE")?.trim() ?? undefined,
    CHANGE_RATE: extractTag(itemXml, "CHANGE_RATE")?.trim() ?? undefined,
  }));
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * 특정 시도의 아파트 매매가격지수를 가져옵니다.
 */
export async function fetchAptTradeIndex(
  sido: Sido,
  startDate: string,
  endDate: string
): Promise<RebIndexItem[]> {
  const rows = await fetchRebIndex("getSidoAptTradeIndex", sido, startDate, endDate);
  return rowsToItems(rows, "apt_trade", sido);
}

/**
 * 특정 시도의 아파트 전세가격지수를 가져옵니다.
 */
export async function fetchAptJeonseIndex(
  sido: Sido,
  startDate: string,
  endDate: string
): Promise<RebIndexItem[]> {
  const rows = await fetchRebIndex("getSidoAptJeonseIndex", sido, startDate, endDate);
  return rowsToItems(rows, "apt_jeonse", sido);
}

function rowsToItems(
  rows: RebApiRow[],
  indexType: "apt_trade" | "apt_jeonse",
  fallbackRegion: string
): RebIndexItem[] {
  return rows
    .filter((r) => r.INDEX_VALUE)
    .map((row) => {
      const baseDateRaw = row.BASE_DATE ?? "";
      // YYYYMM -> YYYY-MM-01
      const baseDate =
        baseDateRaw.length >= 6
          ? `${baseDateRaw.slice(0, 4)}-${baseDateRaw.slice(4, 6)}-01`
          : baseDateRaw;

      return {
        indexType,
        regionName: row.REGION_NM || fallbackRegion,
        indexValue: parseFloat(row.INDEX_VALUE!),
        baseDate,
        prevValue: row.PREV_VALUE ? parseFloat(row.PREV_VALUE) : null,
        changeRate: row.CHANGE_RATE ? parseFloat(row.CHANGE_RATE) : null,
      };
    });
}

/**
 * 모든 시도의 매매/전세 가격지수를 한번에 수집합니다.
 * API 호출 간 딜레이를 두어 과부하를 방지합니다.
 */
export async function fetchAllIndices(
  startDate: string,
  endDate: string
): Promise<RebIndexItem[]> {
  const results: RebIndexItem[] = [];

  for (const sido of SIDO_LIST) {
    try {
      const [trade, jeonse] = await Promise.allSettled([
        fetchAptTradeIndex(sido, startDate, endDate),
        fetchAptJeonseIndex(sido, startDate, endDate),
      ]);

      if (trade.status === "fulfilled") results.push(...trade.value);
      if (jeonse.status === "fulfilled") results.push(...jeonse.value);
    } catch (e) {
      console.error(`${sido} 데이터 수집 실패:`, e);
    }

    // API 호출 간 딜레이 (과부하 방지)
    await delay(300);
  }

  return results;
}

/**
 * API 호출 간 딜레이
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
