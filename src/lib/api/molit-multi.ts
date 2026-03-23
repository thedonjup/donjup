/**
 * 멀티 부동산 유형 국토교통부 실거래가 API 래퍼
 *
 * 아파트/연립다세대/오피스텔/토지/상업업무용 매매 실거래가를
 * 통합 인터페이스로 호출하고 파싱합니다.
 */

import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
} from "@/lib/constants/property-types";

// ---------------------------------------------------------------------------
// 엔드포인트 매핑
// ---------------------------------------------------------------------------

const API_HOST = "https://apis.data.go.kr/1613000";

const PROPERTY_ENDPOINTS: Record<PropertyType, string> = {
  [PROPERTY_TYPES.APT]:
    "RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
  [PROPERTY_TYPES.VILLA]:
    "RTMSDataSvcRHTradeDev/getRTMSDataSvcRHTradeDev",
  [PROPERTY_TYPES.OFFICETEL]:
    "RTMSDataSvcOffiTradeDev/getRTMSDataSvcOffiTradeDev",
  [PROPERTY_TYPES.LAND]:
    "RTMSDataSvcLandTradeDev/getRTMSDataSvcLandTradeDev",
  [PROPERTY_TYPES.COMMERCIAL]:
    "RTMSDataSvcSHTradeDev/getRTMSDataSvcSHTradeDev",
};

export { PROPERTY_TYPE_LABELS };

// ---------------------------------------------------------------------------
// 응답 인터페이스
// ---------------------------------------------------------------------------

/**
 * 유형에 관계없이 통합된 거래 파싱 결과.
 * 토지/상업용은 aptName 대신 용도 등을 넣을 수 있지만,
 * DB 컬럼과의 호환을 위해 필드명은 유지합니다.
 */
export interface ParsedMultiTransaction {
  propertyType: PropertyType;
  regionCode: string;
  dongName: string;
  aptName: string; // 토지: 지목, 상업: 건물명 또는 용도
  sizeSqm: number;
  floor: number;
  tradePrice: number; // 만원 단위
  tradeDate: string; // YYYY-MM-DD
  builtYear: number;
  dealType: string;
  rawData: Record<string, string>;
}

// ---------------------------------------------------------------------------
// 필드 매핑 — 유형별로 이름이 다른 XML 태그를 통합
// ---------------------------------------------------------------------------

/** 각 유형에서 "건물/단지명" 역할을 하는 태그 */
const NAME_TAGS: Record<PropertyType, string> = {
  [PROPERTY_TYPES.APT]: "aptNm",
  [PROPERTY_TYPES.VILLA]: "aptNm",
  [PROPERTY_TYPES.OFFICETEL]: "offiNm",
  [PROPERTY_TYPES.LAND]: "jimok",        // 토지: 지목
  [PROPERTY_TYPES.COMMERCIAL]: "sggNm",  // 상업: 시군구명 (건물명 없음, 용도 대체)
};

/** 각 유형에서 "전용면적" 역할을 하는 태그 */
const SIZE_TAGS: Record<PropertyType, string> = {
  [PROPERTY_TYPES.APT]: "excluUseAr",
  [PROPERTY_TYPES.VILLA]: "excluUseAr",
  [PROPERTY_TYPES.OFFICETEL]: "excluUseAr",
  [PROPERTY_TYPES.LAND]: "dealArea",       // 토지: 거래면적
  [PROPERTY_TYPES.COMMERCIAL]: "excluUseAr",
};

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * 특정 유형, 특정 지역의 특정 월 실거래가 데이터를 가져옵니다.
 */
export async function fetchMultiTransactions(
  propertyType: PropertyType,
  regionCode: string,
  dealYearMonth: string
): Promise<ParsedMultiTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY 환경변수가 설정되지 않았습니다.");

  const endpoint = PROPERTY_ENDPOINTS[propertyType];
  if (!endpoint) {
    throw new Error(`지원하지 않는 부동산 유형: ${propertyType}`);
  }

  const url = `${API_HOST}/${endpoint}?serviceKey=${apiKey}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYearMonth}&pageNo=1&numOfRows=9999`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DonJup/1.0" },
  });

  if (!res.ok) {
    throw new Error(
      `국토부 API 호출 실패 (type=${propertyType}): ${res.status} ${res.statusText}`
    );
  }

  const text = await res.text();
  return parseXmlResponse(text, propertyType, regionCode);
}

// ---------------------------------------------------------------------------
// XML 파서
// ---------------------------------------------------------------------------

function parseXmlResponse(
  xml: string,
  propertyType: PropertyType,
  regionCode: string
): ParsedMultiTransaction[] {
  const items: ParsedMultiTransaction[] = [];

  // 에러 체크
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    const resultMsg = extractTag(xml, "resultMsg");
    console.error(
      `국토부 API 에러 (type=${propertyType}): [${resultCode}] ${resultMsg}`
    );
    return [];
  }

  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return [];

  const nameTag = NAME_TAGS[propertyType];
  const sizeTag = SIZE_TAGS[propertyType];

  for (const itemXml of itemMatches) {
    try {
      const rawPrice = extractTag(itemXml, "dealAmount")?.trim();
      const year = extractTag(itemXml, "dealYear")?.trim();
      const month = extractTag(itemXml, "dealMonth")?.trim();
      const day = extractTag(itemXml, "dealDay")?.trim();
      const dong = extractTag(itemXml, "umdNm")?.trim();
      const name = extractTag(itemXml, nameTag)?.trim();
      const size = extractTag(itemXml, sizeTag)?.trim();
      const floor = extractTag(itemXml, "floor")?.trim();
      const builtYear = extractTag(itemXml, "buildYear")?.trim();
      const dealingGbn = extractTag(itemXml, "dealingGbn")?.trim() || "";

      if (!rawPrice || !year || !month || !day || !size) continue;

      // 토지는 이름이 없을 수 있음 — 지목으로 대체
      const aptName = name || "미상";

      const tradePrice = parseInt(rawPrice.replace(/,/g, ""), 10);
      const tradeDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      // rawData: 파싱에 사용된 태그들을 모두 보존
      const rawData: Record<string, string> = {
        dealAmount: rawPrice,
        buildYear: builtYear || "",
        dealYear: year,
        dealMonth: month,
        dealDay: day,
        umdNm: dong || "",
        [nameTag]: aptName,
        [sizeTag]: size,
        floor: floor || "",
        sggCd: regionCode,
        dealingGbn,
      };

      items.push({
        propertyType,
        regionCode,
        dongName: dong || "",
        aptName,
        sizeSqm: parseFloat(size),
        floor: parseInt(floor || "0", 10),
        tradePrice,
        tradeDate,
        builtYear: parseInt(builtYear || "0", 10),
        dealType: dealingGbn,
        rawData,
      });
    } catch (e) {
      console.error(
        `거래 데이터 파싱 오류 (type=${propertyType}):`,
        e
      );
    }
  }

  return items;
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * API 호출 간 딜레이
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
