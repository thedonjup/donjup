/**
 * 과거 거래 데이터 대량 백필 스크립트
 * 실행: npx tsx scripts/backfill-transactions.ts [시작년도] [종료년도]
 * 예시: npx tsx scripts/backfill-transactions.ts 2020 2026
 *
 * 기본값: 2020년 ~ 현재
 * 서울 25개구 전체 수집
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

const SEOUL_REGION_CODES: Record<string, string> = {
  "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구",
  "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
  "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
  "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구",
  "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
  "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구",
  "11740": "강동구",
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
  const startYear = parseInt(args[0] || "2020", 10);
  const endYear = parseInt(args[1] || String(new Date().getFullYear()), 10);

  const months = generateMonths(startYear, endYear);
  const regionEntries = Object.entries(SEOUL_REGION_CODES);
  const totalCalls = months.length * regionEntries.length;

  console.log(`=== 돈줍 과거 데이터 백필 ===`);
  console.log(`기간: ${startYear}년 ~ ${endYear}년 (${months.length}개월)`);
  console.log(`지역: 서울 ${regionEntries.length}개 구`);
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
        const seen = new Set<string>();
        const complexes = [];
        for (const t of transactions) {
          const key = `${t.regionCode}-${t.aptName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          complexes.push({
            region_code: t.regionCode,
            region_name: name,
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
