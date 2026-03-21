/**
 * 국토교통부 아파트매매 실거래가 API 래퍼
 * https://www.data.go.kr/data/15126469/openapi.do
 */

interface MolitRawItem {
  거래금액: string;
  건축년도: string;
  년: string;
  월: string;
  일: string;
  법정동: string;
  아파트: string;
  전용면적: string;
  층: string;
  지역코드: string;
}

export interface ParsedTransaction {
  regionCode: string;
  dongName: string;
  aptName: string;
  sizeSqm: number;
  floor: number;
  tradePrice: number; // 만원 단위
  tradeDate: string; // YYYY-MM-DD
  builtYear: number;
  rawData: MolitRawItem;
}

const API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

/**
 * 특정 지역의 특정 월 실거래가 데이터를 가져옵니다.
 * @param regionCode 법정동코드 5자리 (예: "11680")
 * @param dealYearMonth 계약년월 YYYYMM (예: "202603")
 */
export async function fetchTransactions(
  regionCode: string,
  dealYearMonth: string
): Promise<ParsedTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY 환경변수가 설정되지 않았습니다.");

  const url = new URL(API_BASE);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("LAWD_CD", regionCode);
  url.searchParams.set("DEAL_YMD", dealYearMonth);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`국토부 API 호출 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  return parseXmlResponse(text, regionCode);
}

function parseXmlResponse(
  xml: string,
  regionCode: string
): ParsedTransaction[] {
  const items: ParsedTransaction[] = [];

  // 에러 체크
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "00") {
    const resultMsg = extractTag(xml, "resultMsg");
    console.error(`국토부 API 에러: [${resultCode}] ${resultMsg}`);
    return [];
  }

  // <item> 태그 추출
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return [];

  for (const itemXml of itemMatches) {
    try {
      const rawPrice = extractTag(itemXml, "거래금액")?.trim();
      const year = extractTag(itemXml, "년")?.trim();
      const month = extractTag(itemXml, "월")?.trim();
      const day = extractTag(itemXml, "일")?.trim();
      const dong = extractTag(itemXml, "법정동")?.trim();
      const aptName = extractTag(itemXml, "아파트")?.trim();
      const size = extractTag(itemXml, "전용면적")?.trim();
      const floor = extractTag(itemXml, "층")?.trim();
      const builtYear = extractTag(itemXml, "건축년도")?.trim();

      if (!rawPrice || !year || !month || !day || !aptName || !size) continue;

      const tradePrice = parseInt(rawPrice.replace(/,/g, ""), 10);
      const tradeDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      items.push({
        regionCode,
        dongName: dong || "",
        aptName: aptName,
        sizeSqm: parseFloat(size),
        floor: parseInt(floor || "0", 10),
        tradePrice,
        tradeDate,
        builtYear: parseInt(builtYear || "0", 10),
        rawData: {
          거래금액: rawPrice,
          건축년도: builtYear || "",
          년: year,
          월: month,
          일: day,
          법정동: dong || "",
          아파트: aptName,
          전용면적: size,
          층: floor || "",
          지역코드: regionCode,
        },
      });
    } catch (e) {
      console.error("거래 데이터 파싱 오류:", e);
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
