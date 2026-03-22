/**
 * 국토교통부 아파트 전월세 실거래가 API 래퍼
 * https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent
 *
 * 실제 API 응답 필드 (영문):
 *   aptNm, deposit, monthlyRent, dealYear, dealMonth, dealDay,
 *   umdNm, excluUseAr, floor, buildYear, sggCd,
 *   contractType, contractTerm, preDeposit, preMonthlyRent 등
 */

interface MolitRentRawItem {
  aptNm: string;
  excluUseAr: string;
  floor: string;
  dealYear: string;
  dealMonth: string;
  dealDay: string;
  deposit: string;
  monthlyRent: string;
  umdNm: string;
  buildYear: string;
  sggCd: string;
  contractType: string;
  contractTerm: string;
  preDeposit: string;
  preMonthlyRent: string;
}

export interface ParsedRentTransaction {
  regionCode: string;
  dongName: string;
  aptName: string;
  sizeSqm: number;
  floor: number;
  deposit: number; // 보증금 (만원)
  monthlyRent: number; // 월세 (만원, 전세=0)
  rentType: string; // '전세' or '월세'
  contractType: string; // 신규/갱신
  contractTerm: string;
  tradeDate: string; // YYYY-MM-DD
  builtYear: number;
  preDeposit: number | null;
  preMonthlyRent: number | null;
  rawData: MolitRentRawItem;
}

const API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

/**
 * 특정 지역의 특정 월 전월세 데이터를 가져옵니다.
 * @param regionCode 법정동코드 5자리 (예: "11680")
 * @param dealYearMonth 계약년월 YYYYMM (예: "202603")
 */
export async function fetchRentTransactions(
  regionCode: string,
  dealYearMonth: string
): Promise<ParsedRentTransaction[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY 환경변수가 설정되지 않았습니다.");

  const url = `${API_BASE}?serviceKey=${apiKey}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYearMonth}&pageNo=1&numOfRows=1000`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DonJup/1.0" },
  });
  if (!res.ok) {
    throw new Error(`국토부 전월세 API 호출 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  return parseXmlResponse(text, regionCode);
}

function parseXmlResponse(
  xml: string,
  regionCode: string
): ParsedRentTransaction[] {
  const items: ParsedRentTransaction[] = [];

  // 에러 체크 — API는 성공 시 "000" 반환
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    const resultMsg = extractTag(xml, "resultMsg");
    console.error(`국토부 전월세 API 에러: [${resultCode}] ${resultMsg}`);
    return [];
  }

  // <item> 태그 추출
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return [];

  for (const itemXml of itemMatches) {
    try {
      const aptName = extractTag(itemXml, "aptNm")?.trim();
      const size = extractTag(itemXml, "excluUseAr")?.trim();
      const floor = extractTag(itemXml, "floor")?.trim();
      const year = extractTag(itemXml, "dealYear")?.trim();
      const month = extractTag(itemXml, "dealMonth")?.trim();
      const day = extractTag(itemXml, "dealDay")?.trim();
      const rawDeposit = extractTag(itemXml, "deposit")?.trim();
      const rawMonthlyRent = extractTag(itemXml, "monthlyRent")?.trim();
      const dong = extractTag(itemXml, "umdNm")?.trim();
      const builtYear = extractTag(itemXml, "buildYear")?.trim();
      const contractType = extractTag(itemXml, "contractType")?.trim() || "";
      const contractTerm = extractTag(itemXml, "contractTerm")?.trim() || "";
      const rawPreDeposit = extractTag(itemXml, "preDeposit")?.trim();
      const rawPreMonthlyRent = extractTag(itemXml, "preMonthlyRent")?.trim();

      if (!aptName || !size || !year || !month || !day || !rawDeposit) continue;

      const deposit = parseInt(rawDeposit.replace(/,/g, ""), 10);
      const monthlyRent = rawMonthlyRent
        ? parseInt(rawMonthlyRent.replace(/,/g, ""), 10)
        : 0;
      const tradeDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      const rentType = monthlyRent > 0 ? "월세" : "전세";

      const preDeposit = rawPreDeposit
        ? parseInt(rawPreDeposit.replace(/,/g, ""), 10)
        : null;
      const preMonthlyRent = rawPreMonthlyRent
        ? parseInt(rawPreMonthlyRent.replace(/,/g, ""), 10)
        : null;

      items.push({
        regionCode,
        dongName: dong || "",
        aptName,
        sizeSqm: parseFloat(size),
        floor: parseInt(floor || "0", 10),
        deposit,
        monthlyRent,
        rentType,
        contractType,
        contractTerm,
        tradeDate,
        builtYear: parseInt(builtYear || "0", 10),
        preDeposit: preDeposit === 0 ? null : preDeposit,
        preMonthlyRent: preMonthlyRent === 0 ? null : preMonthlyRent,
        rawData: {
          aptNm: aptName,
          excluUseAr: size,
          floor: floor || "",
          dealYear: year,
          dealMonth: month,
          dealDay: day,
          deposit: rawDeposit,
          monthlyRent: rawMonthlyRent || "0",
          umdNm: dong || "",
          buildYear: builtYear || "",
          sggCd: regionCode,
          contractType,
          contractTerm,
          preDeposit: rawPreDeposit || "",
          preMonthlyRent: rawPreMonthlyRent || "",
        },
      });
    } catch (e) {
      console.error("전월세 데이터 파싱 오류:", e);
    }
  }

  return items;
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}
