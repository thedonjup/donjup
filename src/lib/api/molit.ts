/**
 * 국토교통부 아파트매매 실거래가 API 래퍼
 * https://www.data.go.kr/data/15126469/openapi.do
 *
 * 실제 API 응답 필드 (영문):
 *   aptNm, dealAmount, dealYear, dealMonth, dealDay,
 *   umdNm, excluUseAr, floor, buildYear, sggCd 등
 */

interface MolitRawItem {
  dealAmount: string;
  buildYear: string;
  dealYear: string;
  dealMonth: string;
  dealDay: string;
  umdNm: string;
  aptNm: string;
  excluUseAr: string;
  floor: string;
  sggCd: string;
  dealingGbn: string;
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
  dealType: string;
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

  // User-Agent 필요 (data.go.kr이 빈 UA 차단)
  const url = `${API_BASE}?serviceKey=${apiKey}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYearMonth}&pageNo=1&numOfRows=1000`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DonJup/1.0" },
  });
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

  // 에러 체크 — API는 성공 시 "000" 반환
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    const resultMsg = extractTag(xml, "resultMsg");
    console.error(`국토부 API 에러: [${resultCode}] ${resultMsg}`);
    return [];
  }

  // <item> 태그 추출
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return [];

  for (const itemXml of itemMatches) {
    try {
      const rawPrice = extractTag(itemXml, "dealAmount")?.trim();
      const year = extractTag(itemXml, "dealYear")?.trim();
      const month = extractTag(itemXml, "dealMonth")?.trim();
      const day = extractTag(itemXml, "dealDay")?.trim();
      const dong = extractTag(itemXml, "umdNm")?.trim();
      const aptName = extractTag(itemXml, "aptNm")?.trim();
      const size = extractTag(itemXml, "excluUseAr")?.trim();
      const floor = extractTag(itemXml, "floor")?.trim();
      const builtYear = extractTag(itemXml, "buildYear")?.trim();
      const dealingGbn = extractTag(itemXml, "dealingGbn")?.trim() || "";

      if (!rawPrice || !year || !month || !day || !aptName || !size) continue;

      const tradePrice = parseInt(rawPrice.replace(/,/g, ""), 10);
      const tradeDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      items.push({
        regionCode,
        dongName: dong || "",
        aptName,
        sizeSqm: parseFloat(size),
        floor: parseInt(floor || "0", 10),
        tradePrice,
        tradeDate,
        builtYear: parseInt(builtYear || "0", 10),
        dealType: dealingGbn,
        rawData: {
          dealAmount: rawPrice,
          buildYear: builtYear || "",
          dealYear: year,
          dealMonth: month,
          dealDay: day,
          umdNm: dong || "",
          aptNm: aptName,
          excluUseAr: size,
          floor: floor || "",
          sggCd: regionCode,
          dealingGbn,
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
