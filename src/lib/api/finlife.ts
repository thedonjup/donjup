/**
 * 금융감독원 금융상품한눈에 (FinLife) API 래퍼
 * https://finlife.fss.or.kr/finlifeapi/
 *
 * 주요 엔드포인트:
 * - mortgageLoanProductsSearch.json: 주택담보대출 상품 조회
 */

const API_BASE = "https://finlife.fss.or.kr/finlifeapi";

/** 금융회사 구분 코드 */
const TOP_FIN_GRP_BANK = "020000"; // 은행

export interface MortgageProduct {
  bankName: string; // 은행명 (kor_co_nm)
  productName: string; // 상품명 (fin_prdt_nm)
  rateType: string; // 금리유형 (변동/고정/혼합)
  rateMin: number; // 최저금리
  rateMax: number; // 최고금리
  rateAvg: number | null; // 평균금리
}

interface FinLifeOptionRow {
  kor_co_nm: string;
  fin_prdt_nm: string;
  lend_rate_type_nm: string;
  lend_rate_min: number | null;
  lend_rate_max: number | null;
  lend_rate_avg: number | null;
}

interface FinLifeBaseRow {
  kor_co_nm: string;
  fin_prdt_nm: string;
  fin_prdt_cd: string;
}

interface FinLifeResponse {
  result: {
    total_count: number;
    max_page_no: number;
    now_page_no: number;
    err_cd: string;
    err_msg: string;
    baseList: FinLifeBaseRow[];
    optionList: FinLifeOptionRow[];
  };
}

/**
 * 주택담보대출 상품 목록을 조회합니다.
 */
export async function fetchMortgageLoanProducts(
  pageNo = 1
): Promise<MortgageProduct[]> {
  const apiKey = process.env.FINLIFE_API_KEY;
  if (!apiKey) {
    console.error("FINLIFE_API_KEY 환경변수가 설정되지 않았습니다.");
    return [];
  }

  const params = new URLSearchParams({
    auth: apiKey,
    topFinGrpNo: TOP_FIN_GRP_BANK,
    pageNo: String(pageNo),
  });

  const url = `${API_BASE}/mortgageLoanProductsSearch.json?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "DonJup/1.0" },
    });

    if (!res.ok) {
      console.error(`FinLife API 호출 실패: ${res.status} ${res.statusText}`);
      return [];
    }

    const data: FinLifeResponse = await res.json();

    if (data.result.err_cd !== "000") {
      console.error(
        `FinLife API 에러: [${data.result.err_cd}] ${data.result.err_msg}`
      );
      return [];
    }

    // baseList에서 상품코드 → 은행명+상품명 매핑 생성
    const baseMap = new Map<string, { bankName: string; productName: string }>();
    for (const base of data.result.baseList ?? []) {
      baseMap.set(base.fin_prdt_cd, {
        bankName: base.kor_co_nm,
        productName: base.fin_prdt_nm,
      });
    }

    // optionList에서 금리 정보 추출
    const products: MortgageProduct[] = [];
    for (const opt of data.result.optionList ?? []) {
      if (opt.lend_rate_min == null || opt.lend_rate_max == null) continue;

      products.push({
        bankName: opt.kor_co_nm,
        productName: opt.fin_prdt_nm,
        rateType: opt.lend_rate_type_nm ?? "기타",
        rateMin: opt.lend_rate_min,
        rateMax: opt.lend_rate_max,
        rateAvg: opt.lend_rate_avg ?? null,
      });
    }

    return products;
  } catch (error) {
    console.error("FinLife API 요청 중 오류:", error);
    return [];
  }
}

/**
 * 모든 페이지의 주택담보대출 상품을 가져옵니다.
 */
export async function fetchAllMortgageProducts(): Promise<MortgageProduct[]> {
  const allProducts: MortgageProduct[] = [];
  let pageNo = 1;
  const maxPages = 5; // 안전 제한

  while (pageNo <= maxPages) {
    const products = await fetchMortgageLoanProducts(pageNo);
    if (products.length === 0) break;
    allProducts.push(...products);
    pageNo++;
  }

  return allProducts;
}

/**
 * 은행명 → rate_type 코드 매핑
 */
export function bankNameToRateType(bankName: string): string {
  const map: Record<string, string> = {
    "KB국민은행": "BANK_KB",
    "국민은행": "BANK_KB",
    "신한은행": "BANK_SHINHAN",
    "우리은행": "BANK_WOORI",
    "하나은행": "BANK_HANA",
    "NH농협은행": "BANK_NH",
    "농협은행": "BANK_NH",
    "IBK기업은행": "BANK_IBK",
    "기업은행": "BANK_IBK",
    "카카오뱅크": "BANK_KAKAO",
    "케이뱅크": "BANK_KBANK",
    "토스뱅크": "BANK_TOSS",
    "SC제일은행": "BANK_SC",
    "한국씨티은행": "BANK_CITI",
    "부산은행": "BANK_BUSAN",
    "대구은행": "BANK_DAEGU",
    "광주은행": "BANK_GWANGJU",
    "전북은행": "BANK_JEONBUK",
    "경남은행": "BANK_GYEONGNAM",
    "제주은행": "BANK_JEJU",
    "수협은행": "BANK_SUHYUP",
    "iM뱅크": "BANK_DAEGU",
  };

  // 정확히 매칭되면 반환
  if (map[bankName]) return map[bankName];

  // 부분 매칭 시도
  for (const [key, value] of Object.entries(map)) {
    if (bankName.includes(key) || key.includes(bankName)) return value;
  }

  // 매칭 안 되면 은행명에서 코드 생성
  return `BANK_${bankName.replace(/[^a-zA-Z가-힣]/g, "").toUpperCase()}`;
}
