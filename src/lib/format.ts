/** 만원 단위 가격을 한글 표기로 변환 */
export function formatPrice(priceInManWon: number): string {
  if (priceInManWon >= 10000) {
    const eok = Math.floor(priceInManWon / 10000);
    const rest = priceInManWon % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${priceInManWon.toLocaleString()}만`;
}

/** 원 단위 금액을 한글 표기로 변환 */
export function formatKrw(won: number): string {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000);
    const rest = Math.floor((won % 100000000) / 10000);
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  }
  if (won >= 10000) {
    return `${Math.floor(won / 10000).toLocaleString()}만원`;
  }
  return `${won.toLocaleString()}원`;
}

/** 금리 지표 한글명 */
export const RATE_LABELS: Record<string, string> = {
  BASE_RATE: "기준금리",
  COFIX_NEW: "COFIX(신규)",
  COFIX_BAL: "COFIX(잔액)",
  CD_91: "CD 91일",
  TREASURY_3Y: "국고채 3년",
};

/** 금리 지표 설명 */
export const RATE_DESCRIPTIONS: Record<string, string> = {
  BASE_RATE: "한국은행 금융통화위원회에서 결정하는 기준금리",
  COFIX_NEW: "신규 주택담보대출 변동금리의 기준이 되는 지표",
  COFIX_BAL: "기존 대출 변동금리 갱신 시 기준이 되는 지표",
  CD_91: "은행 간 단기 자금 거래 금리 (91일 만기)",
  TREASURY_3Y: "정부가 발행하는 3년 만기 국채 수익률",
};

export const RATE_ORDER = ["BASE_RATE", "COFIX_NEW", "COFIX_BAL", "CD_91", "TREASURY_3Y"];
