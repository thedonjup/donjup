/**
 * 로컬 데이터 수집 스크립트
 * 실행: npx tsx scripts/seed-transactions.ts
 *
 * 서울 25개구 × 2개월 실거래가 데이터를 수집하여 Supabase에 저장
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

interface Transaction {
  regionCode: string;
  dongName: string;
  aptName: string;
  sizeSqm: number;
  floor: number;
  tradePrice: number;
  tradeDate: string;
  builtYear: number;
}

async function fetchTransactions(regionCode: string, dealYearMonth: string): Promise<Transaction[]> {
  const url = `${API_BASE}?serviceKey=${MOLIT_API_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYearMonth}&pageNo=1&numOfRows=1000`;

  const res = await fetch(url, { headers: { "User-Agent": "DonJup/1.0" } });
  if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`);

  const xml = await res.text();
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    const msg = extractTag(xml, "resultMsg");
    console.error(`  API 에러: [${resultCode}] ${msg}`);
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
    });
  }

  return items;
}

function toSlug(name: string): string {
  return name.replace(/[^가-힣a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function main() {
  console.log("=== 돈줍 데이터 수집 시작 ===\n");

  const now = new Date();
  const dealYearMonths: string[] = [];
  for (let i = 0; i < 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dealYearMonths.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  console.log(`수집 대상 월: ${dealYearMonths.join(", ")}`);
  console.log(`수집 대상 지역: 서울 ${Object.keys(SEOUL_REGION_CODES).length}개 구\n`);

  let totalInserted = 0;
  let totalNewHigh = 0;
  let totalSignificantDrop = 0;

  const regionEntries = Object.entries(SEOUL_REGION_CODES);

  for (const dealYearMonth of dealYearMonths) {
    console.log(`\n📅 ${dealYearMonth} 수집 중...`);

    for (const [code, name] of regionEntries) {
      try {
        const transactions = await fetchTransactions(code, dealYearMonth);

        if (transactions.length === 0) {
          process.stdout.write(`  ${name}: 데이터 없음\n`);
          await delay(350);
          continue;
        }

        // 1) 단지 마스터 UPSERT
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

        // 2) 기존 최고가 조회 (단지+면적별)
        const enriched = [];
        for (const t of transactions) {
          const { data: maxRow } = await supabase
            .from("apt_transactions")
            .select("trade_price")
            .eq("apt_name", t.aptName)
            .eq("size_sqm", t.sizeSqm)
            .order("trade_price", { ascending: false })
            .limit(1)
            .single();

          const previousHighest = maxRow?.trade_price ?? 0;
          const highestPrice = Math.max(previousHighest, t.tradePrice);
          const isNewHigh = t.tradePrice > previousHighest && previousHighest > 0;

          let changeRate: number | null = null;
          let isSignificantDrop = false;

          if (previousHighest > 0 && !isNewHigh) {
            changeRate = parseFloat(
              (((t.tradePrice - previousHighest) / previousHighest) * 100).toFixed(2)
            );
            isSignificantDrop = changeRate <= -20;
          }

          if (isNewHigh) totalNewHigh++;
          if (isSignificantDrop) totalSignificantDrop++;

          enriched.push({
            region_code: t.regionCode,
            region_name: `${name} ${t.dongName}`,
            apt_name: t.aptName,
            size_sqm: t.sizeSqm,
            floor: t.floor,
            trade_price: t.tradePrice,
            trade_date: t.tradeDate,
            highest_price: highestPrice,
            change_rate: changeRate,
            is_new_high: isNewHigh,
            is_significant_drop: isSignificantDrop,
            raw_data: {},
          });
        }

        // 3) 거래 데이터 UPSERT
        const { data, error } = await supabase
          .from("apt_transactions")
          .upsert(enriched, {
            onConflict: "apt_name,size_sqm,floor,trade_date,trade_price",
            ignoreDuplicates: true,
          })
          .select("id");

        if (error) {
          console.error(`  ${name}: DB 에러 - ${error.message}`);
        } else {
          const count = data?.length ?? 0;
          totalInserted += count;
          process.stdout.write(`  ${name}: ${transactions.length}건 수집, ${count}건 저장\n`);
        }

        await delay(350);
      } catch (e) {
        console.error(`  ${name}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  // 4) 데일리 리포트 생성
  console.log("\n\n📊 데일리 리포트 생성 중...");
  await generateDailyReport();

  console.log(`\n=== 수집 완료 ===`);
  console.log(`총 저장: ${totalInserted}건`);
  console.log(`신고가: ${totalNewHigh}건`);
  console.log(`폭락(20%↓이상): ${totalSignificantDrop}건`);
}

async function generateDailyReport() {
  const today = new Date().toISOString().split("T")[0];

  // 최근 거래 데이터 기반 리포트
  const { data: drops } = await supabase
    .from("apt_transactions")
    .select("*")
    .not("change_rate", "is", null)
    .lt("change_rate", 0)
    .order("change_rate", { ascending: true })
    .limit(10);

  const { data: highs } = await supabase
    .from("apt_transactions")
    .select("*")
    .eq("is_new_high", true)
    .order("trade_date", { ascending: false })
    .limit(10);

  // 거래량 상위 지역
  const { data: allTxns } = await supabase
    .from("apt_transactions")
    .select("region_code,region_name")
    .gte("trade_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);

  const volumeMap: Record<string, { region: string; count: number }> = {};
  for (const t of allTxns ?? []) {
    const region = t.region_name?.split(" ")[0] || t.region_code;
    if (!volumeMap[region]) volumeMap[region] = { region, count: 0 };
    volumeMap[region].count++;
  }
  const volumeSummary = Object.values(volumeMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topDrop = drops?.[0];
  const title = topDrop
    ? `${topDrop.apt_name} ${Math.abs(topDrop.change_rate)}% 하락 외 | ${today} 데일리`
    : `${today} 서울 아파트 실거래 데일리`;

  const { error } = await supabase.from("daily_reports").upsert(
    {
      report_date: today,
      title,
      summary: `서울 아파트 실거래가 폭락/신고가 랭킹 및 거래량 분석`,
      top_drops: drops ?? [],
      top_highs: highs ?? [],
      rate_summary: [],
      volume_summary: volumeSummary,
    },
    { onConflict: "report_date" }
  );

  if (error) {
    console.error(`리포트 생성 실패: ${error.message}`);
  } else {
    console.log(`✅ ${today} 데일리 리포트 생성 완료`);
    console.log(`  폭락 TOP: ${drops?.length ?? 0}건, 신고가: ${highs?.length ?? 0}건`);
  }
}

main().catch(console.error);
