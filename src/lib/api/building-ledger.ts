/**
 * 국토교통부 건축물대장 API 래퍼
 * https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo
 *
 * 건축물 표제부 정보를 조회하여 아파트 단지 부가정보를 가져옵니다.
 */

export interface BuildingLedgerInfo {
  totalUnits: number | null;           // 세대수 (hhldCnt)
  parkingCount: number | null;         // 총 주차대수
  heatingMethod: string | null;        // 난방방식 (heatMethNm)
  floorCount: number | null;           // 지상층수 (grndFlrCnt)
  floorAreaRatio: number | null;       // 용적률 (vlRatEstmTotArea)
  buildingCoverage: number | null;     // 건폐율 (bcRat)
  energyGrade: string | null;          // 에너지효율등급 (enrgEfcl)
  elevatorCount: number | null;        // 승강기 수 (elvCnt)
  emergencyElevatorCount: number | null; // 비상용 승강기 수 (emgenUseElvtCnt)
  landArea: number | null;             // 대지면적 (totArea)
  buildingArea: number | null;         // 건축면적 (archArea)
  totalFloorArea: number | null;       // 연면적 (totDongTotArea)
}

const API_BASE =
  "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";

/**
 * 건축물대장 표제부 정보를 조회합니다.
 * @param sigunguCd 시군구코드 5자리 (예: "11680")
 * @param bldNm 건물명 (예: "래미안")
 * @param bjdongCd 법정동코드 5자리 (기본 "00000" = 전체)
 */
export async function fetchBuildingLedger(
  sigunguCd: string,
  bldNm: string,
  bjdongCd: string = "00000"
): Promise<BuildingLedgerInfo | null> {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) throw new Error("MOLIT_API_KEY 환경변수가 설정되지 않았습니다.");

  const params = new URLSearchParams({
    serviceKey: apiKey,
    sigunguCd,
    bjdongCd,
    bldNm,
    numOfRows: "5",
    pageNo: "1",
  });

  const url = `${API_BASE}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DonJup/1.0" },
  });
  if (!res.ok) {
    throw new Error(`건축물대장 API 호출 실패: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  return parseBuildingLedgerResponse(text);
}

function parseBuildingLedgerResponse(xml: string): BuildingLedgerInfo | null {
  // 에러 체크
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    const resultMsg = extractTag(xml, "resultMsg");
    console.error(`건축물대장 API 에러: [${resultCode}] ${resultMsg}`);
    return null;
  }

  // <item> 태그 추출 — 첫 번째 항목 사용
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
  if (!itemMatch) return null;

  const itemXml = itemMatch[0];

  const hhldCnt = extractTag(itemXml, "hhldCnt")?.trim();
  const grndFlrCnt = extractTag(itemXml, "grndFlrCnt")?.trim();
  const heatMethNm = extractTag(itemXml, "heatMethNm")?.trim();

  // 주차대수 합산: 옥외 + 옥내자주식 + 옥내기계식
  const prkngLoLotCnt = parseInt(extractTag(itemXml, "prkngLoLotCnt")?.trim() || "0", 10) || 0;
  const indrAutoUtcnt = parseInt(extractTag(itemXml, "indrAutoUtcnt")?.trim() || "0", 10) || 0;
  const indrMechUtcnt = parseInt(extractTag(itemXml, "indrMechUtcnt")?.trim() || "0", 10) || 0;
  const totalParking = prkngLoLotCnt + indrAutoUtcnt + indrMechUtcnt;

  // 추가 필드 추출
  const vlRatEstmTotArea = extractTag(itemXml, "vlRatEstmTotArea")?.trim();
  const bcRat = extractTag(itemXml, "bcRat")?.trim();
  const enrgEfcl = extractTag(itemXml, "enrgEfcl")?.trim();
  const elvCnt = extractTag(itemXml, "elvCnt")?.trim();
  const emgenUseElvtCnt = extractTag(itemXml, "emgenUseElvtCnt")?.trim();
  const totArea = extractTag(itemXml, "totArea")?.trim();
  const archArea = extractTag(itemXml, "archArea")?.trim();
  const totDongTotArea = extractTag(itemXml, "totDongTotArea")?.trim();

  return {
    totalUnits: hhldCnt ? parseInt(hhldCnt, 10) || null : null,
    parkingCount: totalParking > 0 ? totalParking : null,
    heatingMethod: heatMethNm || null,
    floorCount: grndFlrCnt ? parseInt(grndFlrCnt, 10) || null : null,
    floorAreaRatio: vlRatEstmTotArea ? parseFloat(vlRatEstmTotArea) || null : null,
    buildingCoverage: bcRat ? parseFloat(bcRat) || null : null,
    energyGrade: enrgEfcl || null,
    elevatorCount: elvCnt ? parseInt(elvCnt, 10) || null : null,
    emergencyElevatorCount: emgenUseElvtCnt ? parseInt(emgenUseElvtCnt, 10) || null : null,
    landArea: totArea ? parseFloat(totArea) || null : null,
    buildingArea: archArea ? parseFloat(archArea) || null : null,
    totalFloorArea: totDongTotArea ? parseFloat(totDongTotArea) || null : null,
  };
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}
