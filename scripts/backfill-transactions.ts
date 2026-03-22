/**
 * 과거 거래 데이터 대량 백필 스크립트 (전국)
 * 실행: npx tsx scripts/backfill-transactions.ts [시작년도] [종료년도] [시도코드]
 * 예시:
 *   npx tsx scripts/backfill-transactions.ts 2006 2026        # 전국 전체
 *   npx tsx scripts/backfill-transactions.ts 2006 2019 11     # 서울만 2006-2019
 *   npx tsx scripts/backfill-transactions.ts 2015 2026 26     # 부산만 2015-2026
 *
 * 기본값: 2006년 ~ 현재, 전국 249개 시군구
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MOLIT_API_KEY = process.env.MOLIT_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !MOLIT_API_KEY) {
  console.error("환경변수 누락: SUPABASE_URL, SERVICE_ROLE_KEY, MOLIT_API_KEY 필요");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 전국 시군구 코드 (17개 시/도, 249개 시/군/구)
const NATIONWIDE_CODES: Record<string, Record<string, string>> = {
  "11": { // 서울
    "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구",
    "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
    "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
    "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구",
    "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
    "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구",
    "11740": "강동구",
  },
  "26": { // 부산
    "26110": "중구", "26140": "서구", "26170": "동구", "26200": "영도구",
    "26230": "부산진구", "26260": "동래구", "26290": "남구", "26320": "북구",
    "26350": "해운대구", "26380": "사하구", "26410": "금정구", "26440": "강서구",
    "26470": "연제구", "26500": "수영구", "26530": "사상구", "26710": "기장군",
  },
  "27": { // 대구
    "27110": "중구", "27140": "동구", "27170": "서구", "27200": "남구",
    "27230": "북구", "27260": "수성구", "27290": "달서구", "27710": "달성군",
  },
  "28": { // 인천
    "28110": "중구", "28140": "동구", "28177": "미추홀구", "28185": "연수구",
    "28200": "남동구", "28237": "부평구", "28245": "계양구", "28260": "서구",
    "28710": "강화군", "28720": "옹진군",
  },
  "29": { // 광주
    "29110": "동구", "29140": "서구", "29155": "남구", "29170": "북구", "29200": "광산구",
  },
  "30": { // 대전
    "30110": "동구", "30140": "중구", "30170": "서구", "30200": "유성구", "30230": "대덕구",
  },
  "31": { // 울산
    "31110": "중구", "31140": "남구", "31170": "동구", "31200": "북구", "31710": "울주군",
  },
  "36": { // 세종
    "36110": "세종시",
  },
  "41": { // 경기
    "41111": "수원시 장안구", "41113": "수원시 권선구", "41115": "수원시 팔달구", "41117": "수원시 영통구",
    "41131": "성남시 수정구", "41133": "성남시 중원구", "41135": "성남시 분당구",
    "41150": "의정부시", "41171": "안양시 만안구", "41173": "안양시 동안구",
    "41190": "부천시", "41210": "광명시", "41220": "평택시", "41250": "동두천시",
    "41271": "안산시 상록구", "41273": "안산시 단원구",
    "41281": "고양시 덕양구", "41285": "고양시 일산동구", "41287": "고양시 일산서구",
    "41290": "과천시", "41310": "구리시", "41360": "남양주시", "41370": "오산시",
    "41390": "시흥시", "41410": "군포시", "41430": "의왕시", "41450": "하남시",
    "41461": "용인시 처인구", "41463": "용인시 기흥구", "41465": "용인시 수지구",
    "41480": "파주시", "41500": "이천시", "41550": "김포시", "41570": "화성시",
    "41590": "광주시", "41610": "양주시", "41630": "포천시", "41650": "여주시",
    "41800": "연천군", "41820": "가평군", "41830": "양평군",
  },
  "42": { // 강원
    "42110": "춘천시", "42130": "원주시", "42150": "강릉시", "42170": "동해시",
    "42190": "태백시", "42210": "속초시", "42230": "삼척시",
    "42720": "홍천군", "42730": "횡성군", "42750": "영월군", "42760": "평창군",
    "42770": "정선군", "42780": "철원군", "42790": "화천군", "42800": "양구군",
    "42810": "인제군", "42820": "고성군", "42830": "양양군",
  },
  "43": { // 충북
    "43110": "청주시 상당구", "43111": "청주시 서원구", "43112": "청주시 흥덕구", "43113": "청주시 청원구",
    "43130": "충주시", "43150": "제천시",
    "43720": "보은군", "43730": "옥천군", "43740": "영동군", "43745": "증평군",
    "43750": "진천군", "43760": "괴산군", "43770": "음성군", "43800": "단양군",
  },
  "44": { // 충남
    "44131": "천안시 동남구", "44133": "천안시 서북구", "44150": "공주시", "44180": "보령시",
    "44200": "아산시", "44210": "서산시", "44230": "논산시", "44250": "계룡시", "44270": "당진시",
    "44710": "금산군", "44760": "부여군", "44770": "서천군", "44790": "청양군",
    "44800": "홍성군", "44810": "예산군", "44825": "태안군",
  },
  "45": { // 전북
    "45111": "전주시 완산구", "45113": "전주시 덕진구", "45130": "군산시", "45140": "익산시",
    "45180": "정읍시", "45190": "남원시", "45210": "김제시",
    "45710": "완주군", "45720": "진안군", "45730": "무주군", "45740": "장수군",
    "45750": "임실군", "45770": "순창군", "45790": "고창군", "45800": "부안군",
  },
  "46": { // 전남
    "46110": "목포시", "46130": "여수시", "46150": "순천시", "46170": "나주시", "46230": "광양시",
    "46710": "담양군", "46720": "곡성군", "46730": "구례군", "46770": "고흥군",
    "46780": "보성군", "46790": "화순군", "46800": "장흥군", "46810": "강진군",
    "46820": "해남군", "46830": "영암군", "46840": "무안군", "46860": "함평군",
    "46870": "영광군", "46880": "장성군", "46890": "완도군", "46900": "진도군", "46910": "신안군",
  },
  "47": { // 경북
    "47110": "포항시 남구", "47111": "포항시 북구", "47130": "경주시", "47150": "김천시",
    "47170": "안동시", "47190": "구미시", "47210": "영주시", "47230": "영천시",
    "47250": "상주시", "47280": "문경시", "47290": "경산시",
    "47720": "군위군", "47730": "의성군", "47750": "청송군", "47760": "영양군",
    "47770": "영덕군", "47820": "청도군", "47830": "고령군", "47840": "성주군",
    "47850": "칠곡군", "47900": "예천군", "47920": "봉화군", "47930": "울진군", "47940": "울릉군",
  },
  "48": { // 경남
    "48121": "창원시 의창구", "48123": "창원시 성산구", "48125": "창원시 마산합포구",
    "48127": "창원시 마산회원구", "48129": "창원시 진해구",
    "48170": "진주시", "48220": "통영시", "48240": "사천시", "48250": "김해시",
    "48270": "밀양시", "48310": "거제시", "48330": "양산시",
    "48720": "의령군", "48730": "함안군", "48740": "창녕군", "48820": "고성군",
    "48840": "남해군", "48850": "하동군", "48860": "산청군", "48870": "함양군",
    "48880": "거창군", "48890": "합천군",
  },
  "50": { // 제주
    "50110": "제주시", "50130": "서귀포시",
  },
};

const SIDO_NAMES: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "36": "세종", "41": "경기", "42": "강원",
  "43": "충북", "44": "충남", "45": "전북", "46": "전남", "47": "경북",
  "48": "경남", "50": "제주",
};

const API_BASE = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSlug(name: string): string {
  return name.replace(/[^가-힣a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

interface Transaction {
  regionCode: string;
  dongName: string;
  aptName: string;
  sizeSqm: number;
  floor: number;
  tradePrice: number;
  tradeDate: string;
  builtYear: number;
  dealType: string;
}

async function fetchTransactions(regionCode: string, dealYearMonth: string): Promise<Transaction[]> {
  const url = `${API_BASE}?serviceKey=${MOLIT_API_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYearMonth}&pageNo=1&numOfRows=9999`;

  const res = await fetch(url, { headers: { "User-Agent": "DonJup/1.0" } });
  if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`);

  const xml = await res.text();
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    return [];
  }

  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return [];

  const items: Transaction[] = [];
  for (const itemXml of itemMatches) {
    const rawPrice = extractTag(itemXml, "dealAmount")?.trim();
    const year = extractTag(itemXml, "dealYear")?.trim();
    const month = extractTag(itemXml, "dealMonth")?.trim();
    const day = extractTag(itemXml, "dealDay")?.trim();
    const dong = extractTag(itemXml, "umdNm")?.trim();
    const aptName = extractTag(itemXml, "aptNm")?.trim();
    const size = extractTag(itemXml, "excluUseAr")?.trim();
    const floor = extractTag(itemXml, "floor")?.trim();
    const builtYear = extractTag(itemXml, "buildYear")?.trim();
    const dealType = extractTag(itemXml, "dealingGbn")?.trim() || "";

    if (!rawPrice || !year || !month || !day || !aptName || !size) continue;

    items.push({
      regionCode,
      dongName: dong || "",
      aptName,
      sizeSqm: parseFloat(size),
      floor: parseInt(floor || "0", 10),
      tradePrice: parseInt(rawPrice.replace(/,/g, ""), 10),
      tradeDate: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
      builtYear: parseInt(builtYear || "0", 10),
      dealType,
    });
  }

  return items;
}

function generateMonths(startYear: number, endYear: number): string[] {
  const months: string[] = [];
  const now = new Date();
  const currentYM = now.getFullYear() * 100 + (now.getMonth() + 1);

  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const ym = y * 100 + m;
      if (ym > currentYM) break;
      months.push(`${y}${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

async function main() {
  const args = process.argv.slice(2);
  const startYear = parseInt(args[0] || "2006", 10);
  const endYear = parseInt(args[1] || String(new Date().getFullYear()), 10);
  const sidoFilter = args[2] || null; // 특정 시/도만 수집 (예: "11" = 서울)

  // 대상 지역 결정
  const regionEntries: [string, string][] = [];
  const targetSidos = sidoFilter
    ? { [sidoFilter]: NATIONWIDE_CODES[sidoFilter] }
    : NATIONWIDE_CODES;

  for (const [sidoCode, sigungu] of Object.entries(targetSidos)) {
    if (!sigungu) continue;
    const sidoName = SIDO_NAMES[sidoCode] || sidoCode;
    for (const [code, name] of Object.entries(sigungu)) {
      regionEntries.push([code, `${sidoName} ${name}`]);
    }
  }

  const months = generateMonths(startYear, endYear);
  const totalCalls = months.length * regionEntries.length;

  console.log(`=== 돈줍 과거 데이터 백필 (전국) ===`);
  console.log(`기간: ${startYear}년 ~ ${endYear}년 (${months.length}개월)`);
  console.log(`지역: ${sidoFilter ? SIDO_NAMES[sidoFilter] : "전국"} ${regionEntries.length}개 시/군/구`);
  console.log(`총 API 호출 예상: ${totalCalls}회`);
  console.log(`예상 소요시간: ~${Math.ceil(totalCalls * 0.4 / 60)}분\n`);

  let totalInserted = 0;
  let callCount = 0;

  for (const ym of months) {
    console.log(`\n📅 ${ym} 수집 중...`);

    for (const [code, name] of regionEntries) {
      callCount++;
      try {
        const transactions = await fetchTransactions(code, ym);

        if (transactions.length === 0) {
          await delay(300);
          continue;
        }

        // 단지 마스터 UPSERT
        const sidoName = name.split(" ")[0]; // "서울 종로구" → "서울"
        const sigunguName = name.split(" ").slice(1).join(" ") || name;
        const seen = new Set<string>();
        const complexes = [];
        for (const t of transactions) {
          const key = `${t.regionCode}-${t.aptName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          complexes.push({
            region_code: t.regionCode,
            region_name: sigunguName,
            dong_name: t.dongName,
            apt_name: t.aptName,
            built_year: t.builtYear || null,
            slug: `${t.regionCode}-${toSlug(t.aptName)}`,
          });
        }
        if (complexes.length > 0) {
          await supabase.from("apt_complexes").upsert(complexes, { onConflict: "slug", ignoreDuplicates: true });
        }

        // 거래 데이터 배치 UPSERT (최고가 계산 없이 빠르게 삽입)
        const batch = transactions.map((t) => ({
          region_code: t.regionCode,
          region_name: `${name} ${t.dongName}`,
          apt_name: t.aptName,
          size_sqm: t.sizeSqm,
          floor: t.floor,
          trade_price: t.tradePrice,
          trade_date: t.tradeDate,
          deal_type: t.dealType || null,
          highest_price: null,
          change_rate: null,
          is_new_high: false,
          is_significant_drop: false,
          raw_data: {},
        }));

        // 500건씩 분할 삽입
        for (let i = 0; i < batch.length; i += 500) {
          const chunk = batch.slice(i, i + 500);
          const { data, error } = await supabase
            .from("apt_transactions")
            .upsert(chunk, {
              onConflict: "apt_name,size_sqm,floor,trade_date,trade_price",
              ignoreDuplicates: true,
            })
            .select("id");

          if (error) {
            console.error(`  ${name}: DB 에러 - ${error.message}`);
          } else {
            totalInserted += data?.length ?? 0;
          }
        }

        process.stdout.write(`  [${callCount}/${totalCalls}] ${name}: ${transactions.length}건\n`);
        await delay(300);
      } catch (e) {
        console.error(`  ${name}(${ym}): ${e instanceof Error ? e.message : e}`);
        await delay(1000);
      }
    }
  }

  // 최고가/변동률 일괄 재계산
  console.log("\n\n📊 최고가/변동률 재계산 중...");
  await recalculateChangeRates();

  console.log(`\n=== 백필 완료 ===`);
  console.log(`총 저장: ${totalInserted}건`);
}

async function recalculateChangeRates() {
  // 단지+면적별 그룹으로 최고가 재계산
  const { data: groups } = await supabase
    .from("apt_transactions")
    .select("apt_name,size_sqm")
    .order("apt_name")
    .limit(50000);

  if (!groups) return;

  const uniqueKeys = new Set<string>();
  for (const g of groups) {
    uniqueKeys.add(`${g.apt_name}|${g.size_sqm}`);
  }

  console.log(`  ${uniqueKeys.size}개 단지-면적 그룹 재계산...`);

  let processed = 0;
  for (const key of uniqueKeys) {
    const [aptName, sizeSqm] = key.split("|");

    // 해당 그룹의 모든 거래를 가격 내림차순으로
    const { data: txns } = await supabase
      .from("apt_transactions")
      .select("id,trade_price,trade_date")
      .eq("apt_name", aptName)
      .eq("size_sqm", parseFloat(sizeSqm))
      .order("trade_date", { ascending: true });

    if (!txns || txns.length === 0) continue;

    let runningMax = 0;
    const updates = [];

    for (const t of txns) {
      const isNewHigh = t.trade_price > runningMax && runningMax > 0;
      const highestPrice = Math.max(runningMax, t.trade_price);

      let changeRate: number | null = null;
      let isSignificantDrop = false;

      if (runningMax > 0 && !isNewHigh) {
        changeRate = parseFloat(
          (((t.trade_price - runningMax) / runningMax) * 100).toFixed(2)
        );
        isSignificantDrop = changeRate <= -20;
      }

      updates.push({
        id: t.id,
        highest_price: highestPrice,
        change_rate: changeRate,
        is_new_high: isNewHigh,
        is_significant_drop: isSignificantDrop,
      });

      runningMax = highestPrice;
    }

    // 배치 업데이트
    for (const u of updates) {
      await supabase
        .from("apt_transactions")
        .update({
          highest_price: u.highest_price,
          change_rate: u.change_rate,
          is_new_high: u.is_new_high,
          is_significant_drop: u.is_significant_drop,
        })
        .eq("id", u.id);
    }

    processed++;
    if (processed % 100 === 0) {
      process.stdout.write(`  ${processed}/${uniqueKeys.size} 완료\n`);
    }
  }

  console.log(`  ✅ ${processed}개 그룹 재계산 완료`);
}

main().catch(console.error);
