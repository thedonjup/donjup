/**
 * 최고가/변동률 일괄 재계산 스크립트
 *
 * 백필 후 highest_price, change_rate가 NULL인 거래 데이터에 대해
 * apt_name + size_sqm 그룹별로 시간순 누적 MAX를 계산하여 업데이트한다.
 *
 * 실행: npx tsx scripts/recalculate-prices.ts
 *
 * 특징:
 * - 지역별 처리 (서울 25개 구 → 전국)
 * - Window 함수 미사용 (Supabase 무료 티어 타임아웃 방지)
 * - JavaScript에서 누적 MAX 계산
 * - 500건 단위 배치 업데이트
 * - 진행률 실시간 표시
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요"
  );
  console.error(".env.local 파일을 확인하세요.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 전국 지역 코드 (서울 25개 구 우선)
const REGION_CODES: Record<string, string> = {
  // 서울 (25개 구)
  "11110": "서울 종로구",
  "11140": "서울 중구",
  "11170": "서울 용산구",
  "11200": "서울 성동구",
  "11215": "서울 광진구",
  "11230": "서울 동대문구",
  "11260": "서울 중랑구",
  "11290": "서울 성북구",
  "11305": "서울 강북구",
  "11320": "서울 도봉구",
  "11350": "서울 노원구",
  "11380": "서울 은평구",
  "11410": "서울 서대문구",
  "11440": "서울 마포구",
  "11470": "서울 양천구",
  "11500": "서울 강서구",
  "11530": "서울 구로구",
  "11545": "서울 금천구",
  "11560": "서울 영등포구",
  "11590": "서울 동작구",
  "11620": "서울 관악구",
  "11650": "서울 서초구",
  "11680": "서울 강남구",
  "11710": "서울 송파구",
  "11740": "서울 강동구",
  // 부산
  "26110": "부산 중구",
  "26140": "부산 서구",
  "26170": "부산 동구",
  "26200": "부산 영도구",
  "26230": "부산 부산진구",
  "26260": "부산 동래구",
  "26290": "부산 남구",
  "26320": "부산 북구",
  "26350": "부산 해운대구",
  "26380": "부산 사하구",
  "26410": "부산 금정구",
  "26440": "부산 강서구",
  "26470": "부산 연제구",
  "26500": "부산 수영구",
  "26530": "부산 사상구",
  "26710": "부산 기장군",
  // 대구
  "27110": "대구 중구",
  "27140": "대구 동구",
  "27170": "대구 서구",
  "27200": "대구 남구",
  "27230": "대구 북구",
  "27260": "대구 수성구",
  "27290": "대구 달서구",
  "27710": "대구 달성군",
  // 인천
  "28110": "인천 중구",
  "28140": "인천 동구",
  "28177": "인천 미추홀구",
  "28185": "인천 연수구",
  "28200": "인천 남동구",
  "28237": "인천 부평구",
  "28245": "인천 계양구",
  "28260": "인천 서구",
  "28710": "인천 강화군",
  "28720": "인천 옹진군",
  // 광주
  "29110": "광주 동구",
  "29140": "광주 서구",
  "29155": "광주 남구",
  "29170": "광주 북구",
  "29200": "광주 광산구",
  // 대전
  "30110": "대전 동구",
  "30140": "대전 중구",
  "30170": "대전 서구",
  "30200": "대전 유성구",
  "30230": "대전 대덕구",
  // 울산
  "31110": "울산 중구",
  "31140": "울산 남구",
  "31170": "울산 동구",
  "31200": "울산 북구",
  "31710": "울산 울주군",
  // 세종
  "36110": "세종 세종시",
  // 경기
  "41111": "경기 수원시 장안구",
  "41113": "경기 수원시 권선구",
  "41115": "경기 수원시 팔달구",
  "41117": "경기 수원시 영통구",
  "41131": "경기 성남시 수정구",
  "41133": "경기 성남시 중원구",
  "41135": "경기 성남시 분당구",
  "41150": "경기 의정부시",
  "41171": "경기 안양시 만안구",
  "41173": "경기 안양시 동안구",
  "41190": "경기 부천시",
  "41210": "경기 광명시",
  "41220": "경기 평택시",
  "41250": "경기 동두천시",
  "41271": "경기 안산시 상록구",
  "41273": "경기 안산시 단원구",
  "41281": "경기 고양시 덕양구",
  "41285": "경기 고양시 일산동구",
  "41287": "경기 고양시 일산서구",
  "41290": "경기 과천시",
  "41310": "경기 구리시",
  "41360": "경기 남양주시",
  "41370": "경기 오산시",
  "41390": "경기 시흥시",
  "41410": "경기 군포시",
  "41430": "경기 의왕시",
  "41450": "경기 하남시",
  "41461": "경기 용인시 처인구",
  "41463": "경기 용인시 기흥구",
  "41465": "경기 용인시 수지구",
  "41480": "경기 파주시",
  "41500": "경기 이천시",
  "41550": "경기 김포시",
  "41570": "경기 화성시",
  "41590": "경기 광주시",
  "41610": "경기 양주시",
  "41630": "경기 포천시",
  "41650": "경기 여주시",
  "41800": "경기 연천군",
  "41820": "경기 가평군",
  "41830": "경기 양평군",
  // 강원
  "42110": "강원 춘천시",
  "42130": "강원 원주시",
  "42150": "강원 강릉시",
  "42170": "강원 동해시",
  "42190": "강원 태백시",
  "42210": "강원 속초시",
  "42230": "강원 삼척시",
  "42720": "강원 홍천군",
  "42730": "강원 횡성군",
  "42750": "강원 영월군",
  "42760": "강원 평창군",
  "42770": "강원 정선군",
  "42780": "강원 철원군",
  "42790": "강원 화천군",
  "42800": "강원 양구군",
  "42810": "강원 인제군",
  "42820": "강원 고성군",
  "42830": "강원 양양군",
  // 충북
  "43110": "충북 청주시 상당구",
  "43111": "충북 청주시 서원구",
  "43112": "충북 청주시 흥덕구",
  "43113": "충북 청주시 청원구",
  "43130": "충북 충주시",
  "43150": "충북 제천시",
  "43720": "충북 보은군",
  "43730": "충북 옥천군",
  "43740": "충북 영동군",
  "43745": "충북 증평군",
  "43750": "충북 진천군",
  "43760": "충북 괴산군",
  "43770": "충북 음성군",
  "43800": "충북 단양군",
  // 충남
  "44131": "충남 천안시 동남구",
  "44133": "충남 천안시 서북구",
  "44150": "충남 공주시",
  "44180": "충남 보령시",
  "44200": "충남 아산시",
  "44210": "충남 서산시",
  "44230": "충남 논산시",
  "44250": "충남 계룡시",
  "44270": "충남 당진시",
  "44710": "충남 금산군",
  "44760": "충남 부여군",
  "44770": "충남 서천군",
  "44790": "충남 청양군",
  "44800": "충남 홍성군",
  "44810": "충남 예산군",
  "44825": "충남 태안군",
  // 전북
  "45111": "전북 전주시 완산구",
  "45113": "전북 전주시 덕진구",
  "45130": "전북 군산시",
  "45140": "전북 익산시",
  "45180": "전북 정읍시",
  "45190": "전북 남원시",
  "45210": "전북 김제시",
  "45710": "전북 완주군",
  "45720": "전북 진안군",
  "45730": "전북 무주군",
  "45740": "전북 장수군",
  "45750": "전북 임실군",
  "45770": "전북 순창군",
  "45790": "전북 고창군",
  "45800": "전북 부안군",
  // 전남
  "46110": "전남 목포시",
  "46130": "전남 여수시",
  "46150": "전남 순천시",
  "46170": "전남 나주시",
  "46230": "전남 광양시",
  "46710": "전남 담양군",
  "46720": "전남 곡성군",
  "46730": "전남 구례군",
  "46770": "전남 고흥군",
  "46780": "전남 보성군",
  "46790": "전남 화순군",
  "46800": "전남 장흥군",
  "46810": "전남 강진군",
  "46820": "전남 해남군",
  "46830": "전남 영암군",
  "46840": "전남 무안군",
  "46860": "전남 함평군",
  "46870": "전남 영광군",
  "46880": "전남 장성군",
  "46890": "전남 완도군",
  "46900": "전남 진도군",
  "46910": "전남 신안군",
  // 경북
  "47110": "경북 포항시 남구",
  "47111": "경북 포항시 북구",
  "47130": "경북 경주시",
  "47150": "경북 김천시",
  "47170": "경북 안동시",
  "47190": "경북 구미시",
  "47210": "경북 영주시",
  "47230": "경북 영천시",
  "47250": "경북 상주시",
  "47280": "경북 문경시",
  "47290": "경북 경산시",
  "47720": "경북 군위군",
  "47730": "경북 의성군",
  "47750": "경북 청송군",
  "47760": "경북 영양군",
  "47770": "경북 영덕군",
  "47820": "경북 청도군",
  "47830": "경북 고령군",
  "47840": "경북 성주군",
  "47850": "경북 칠곡군",
  "47900": "경북 예천군",
  "47920": "경북 봉화군",
  "47930": "경북 울진군",
  "47940": "경북 울릉군",
  // 경남
  "48121": "경남 창원시 의창구",
  "48123": "경남 창원시 성산구",
  "48125": "경남 창원시 마산합포구",
  "48127": "경남 창원시 마산회원구",
  "48129": "경남 창원시 진해구",
  "48170": "경남 진주시",
  "48220": "경남 통영시",
  "48240": "경남 사천시",
  "48250": "경남 김해시",
  "48270": "경남 밀양시",
  "48310": "경남 거제시",
  "48330": "경남 양산시",
  "48720": "경남 의령군",
  "48730": "경남 함안군",
  "48740": "경남 창녕군",
  "48820": "경남 고성군",
  "48840": "경남 남해군",
  "48850": "경남 하동군",
  "48860": "경남 산청군",
  "48870": "경남 함양군",
  "48880": "경남 거창군",
  "48890": "경남 합천군",
  // 제주
  "50110": "제주 제주시",
  "50130": "제주 서귀포시",
};

interface TransactionRow {
  id: string;
  apt_name: string;
  size_sqm: number;
  trade_price: number;
  trade_date: string;
}

interface UpdateRecord {
  id: string;
  highest_price: number;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
}

/**
 * 특정 지역의 모든 거래를 조회한다.
 * Supabase는 기본 1000행 제한이 있으므로 페이지네이션으로 전체를 가져온다.
 */
async function fetchAllTransactions(
  regionCode: string
): Promise<TransactionRow[]> {
  const allRows: TransactionRow[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("apt_transactions")
      .select("id,apt_name,size_sqm,trade_price,trade_date")
      .eq("region_code", regionCode)
      .order("apt_name", { ascending: true })
      .order("size_sqm", { ascending: true })
      .order("trade_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`조회 실패 (${regionCode}): ${error.message}`);
    }

    if (!data || data.length === 0) break;

    // data에는 apt_name, size_sqm도 포함되어 있지만 타입은 TransactionRow로 캐스팅
    allRows.push(
      ...data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        apt_name: row.apt_name as string,
        size_sqm: row.size_sqm as number,
        trade_price: row.trade_price as number,
        trade_date: row.trade_date as string,
      }))
    );

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allRows;
}

/**
 * 거래 목록을 apt_name+size_sqm 그룹별로 분류하고
 * 각 그룹 내에서 시간순 누적 MAX를 계산한다.
 */
function calculateUpdates(
  rows: Array<{
    id: string;
    apt_name: string;
    size_sqm: number;
    trade_price: number;
    trade_date: string;
  }>
): UpdateRecord[] {
  const updates: UpdateRecord[] = [];

  // 이미 apt_name, size_sqm, trade_date, id 순으로 정렬되어 있음
  let currentGroup = "";
  let runningMax = 0;

  for (const row of rows) {
    const groupKey = `${row.apt_name}|${row.size_sqm}`;

    if (groupKey !== currentGroup) {
      // 새 그룹 시작
      currentGroup = groupKey;
      runningMax = 0;
    }

    const prevHighest = runningMax;
    const isNewHigh = row.trade_price > prevHighest && prevHighest > 0;
    const highestPrice = Math.max(prevHighest, row.trade_price);

    let changeRate: number | null = null;
    let isSignificantDrop = false;

    if (prevHighest > 0 && !isNewHigh) {
      changeRate = parseFloat(
        (((row.trade_price - prevHighest) / prevHighest) * 100).toFixed(2)
      );
      isSignificantDrop = changeRate <= -20;
    }

    updates.push({
      id: row.id,
      highest_price: highestPrice,
      change_rate: changeRate,
      is_new_high: isNewHigh,
      is_significant_drop: isSignificantDrop,
    });

    runningMax = highestPrice;
  }

  return updates;
}

/**
 * 업데이트 레코드를 500건 단위로 DB에 반영한다.
 */
async function applyUpdates(updates: UpdateRecord[]): Promise<number> {
  const BATCH_SIZE = 500;
  let applied = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    // Supabase JS 클라이언트는 배치 UPDATE를 직접 지원하지 않으므로
    // 각 건을 개별 업데이트하되, Promise.all로 병렬 처리한다.
    // 단, 너무 많은 병렬 요청은 rate limit에 걸리므로 50건씩 청크로 처리
    const PARALLEL_SIZE = 50;
    for (let j = 0; j < batch.length; j += PARALLEL_SIZE) {
      const parallelBatch = batch.slice(j, j + PARALLEL_SIZE);
      const promises = parallelBatch.map((u) =>
        supabase
          .from("apt_transactions")
          .update({
            highest_price: u.highest_price,
            change_rate: u.change_rate,
            is_new_high: u.is_new_high,
            is_significant_drop: u.is_significant_drop,
          })
          .eq("id", u.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error(
          `    배치 업데이트 에러 ${errors.length}건: ${errors[0].error?.message}`
        );
      }
      applied += parallelBatch.length - errors.length;
    }
  }

  return applied;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분 ${seconds % 60}초`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${seconds % 60}초`;
  }
  return `${seconds}초`;
}

async function main() {
  const startTime = Date.now();
  const regionEntries = Object.entries(REGION_CODES);
  const totalRegions = regionEntries.length;

  console.log("=== 돈줍 최고가/변동률 일괄 재계산 ===");
  console.log(`대상 지역: ${totalRegions}개 시/군/구`);
  console.log(`시작 시각: ${new Date().toLocaleString("ko-KR")}`);
  console.log("");

  // 전체 통계
  let totalTransactions = 0;
  let totalUpdated = 0;
  let totalNewHighs = 0;
  let totalSignificantDrops = 0;
  let totalGroups = 0;
  let regionsProcessed = 0;
  let regionsSkipped = 0;

  for (const [regionCode, regionName] of regionEntries) {
    regionsProcessed++;
    const regionStart = Date.now();

    try {
      // 1. 해당 지역 전체 거래 조회
      const rows = await fetchAllTransactions(regionCode);

      if (rows.length === 0) {
        regionsSkipped++;
        process.stdout.write(
          `[${regionsProcessed}/${totalRegions}] ${regionName} (${regionCode}): 거래 없음 - 스킵\n`
        );
        continue;
      }

      // 2. 그룹별 누적 MAX 계산
      const updates = calculateUpdates(rows);

      // 통계
      const newHighs = updates.filter((u) => u.is_new_high).length;
      const significantDrops = updates.filter(
        (u) => u.is_significant_drop
      ).length;
      const groupKeys = new Set(
        rows.map(
          (r: { apt_name: string; size_sqm: number }) =>
            `${r.apt_name}|${r.size_sqm}`
        )
      );

      // 3. DB 업데이트
      const applied = await applyUpdates(updates);

      const elapsed = Date.now() - regionStart;
      totalTransactions += rows.length;
      totalUpdated += applied;
      totalNewHighs += newHighs;
      totalSignificantDrops += significantDrops;
      totalGroups += groupKeys.size;

      process.stdout.write(
        `[${regionsProcessed}/${totalRegions}] ${regionName} (${regionCode}): ` +
          `${rows.length}건, ${groupKeys.size}그룹, ` +
          `신고가 ${newHighs}, 폭락 ${significantDrops} ` +
          `(${formatDuration(elapsed)})\n`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[${regionsProcessed}/${totalRegions}] ${regionName} (${regionCode}): 에러 - ${msg}`
      );
    }
  }

  const totalElapsed = Date.now() - startTime;

  console.log("");
  console.log("=== 재계산 완료 ===");
  console.log(`소요 시간: ${formatDuration(totalElapsed)}`);
  console.log(`처리 지역: ${regionsProcessed - regionsSkipped}/${totalRegions}개 (스킵: ${regionsSkipped})`);
  console.log(`총 거래 건수: ${totalTransactions.toLocaleString()}건`);
  console.log(`총 업데이트: ${totalUpdated.toLocaleString()}건`);
  console.log(`총 그룹 수: ${totalGroups.toLocaleString()}개 (apt_name + size_sqm)`);
  console.log(`신고가 갱신: ${totalNewHighs.toLocaleString()}건`);
  console.log(`유의미 폭락 (20%+): ${totalSignificantDrops.toLocaleString()}건`);
  console.log("");

  // 검증: NULL highest_price 잔존 건수 확인
  console.log("--- 검증: NULL highest_price 잔존 확인 ---");
  const { count: nullCount, error: countError } = await supabase
    .from("apt_transactions")
    .select("id", { count: "exact", head: true })
    .is("highest_price", null);

  if (countError) {
    console.error(`검증 쿼리 실패: ${countError.message}`);
  } else {
    console.log(`NULL highest_price 잔존: ${(nullCount ?? 0).toLocaleString()}건`);
    if ((nullCount ?? 0) === 0) {
      console.log("모든 거래의 최고가/변동률이 정상 계산되었습니다.");
    } else {
      console.log(
        "아직 NULL이 남아있습니다. 누락된 지역이 있는지 확인하세요."
      );
    }
  }
}

main().catch((e) => {
  console.error("치명적 에러:", e);
  process.exit(1);
});
