/**
 * 로컬 데이터 수집 스크립트
 * 실행: npx tsx scripts/seed-transactions.ts
 *
 * 서울 25개구 x 2개월 실거래가 데이터를 수집하여 CockroachDB에 저장
 */

import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL!;
const MOLIT_API_KEY = process.env.MOLIT_API_KEY!;

if (!DATABASE_URL || !MOLIT_API_KEY) {
  console.error("환경변수 누락: DATABASE_URL, MOLIT_API_KEY 필요");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 5,
});

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
    console.log(`\n${dealYearMonth} 수집 중...`);

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
        for (const t of transactions) {
          const key = `${t.regionCode}-${t.aptName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const slug = `${t.regionCode}-${toSlug(t.aptName)}`;
          await pool.query(
            `INSERT INTO "apt_complexes" ("region_code", "region_name", "dong_name", "apt_name", "built_year", "slug")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("slug") DO NOTHING`,
            [t.regionCode, name, t.dongName, t.aptName, t.builtYear || null, slug]
          );
        }

        // 2) 기존 최고가 조회 (단지+면적별) 및 거래 데이터 UPSERT
        let insertedCount = 0;
        for (const t of transactions) {
          const maxResult = await pool.query(
            `SELECT "trade_price" FROM "apt_transactions"
             WHERE "apt_name" = $1 AND "size_sqm" = $2
             ORDER BY "trade_price" DESC LIMIT 1`,
            [t.aptName, t.sizeSqm]
          );

          const previousHighest = maxResult.rows[0]?.trade_price ?? 0;
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

          const result = await pool.query(
            `INSERT INTO "apt_transactions"
             ("region_code", "region_name", "apt_name", "size_sqm", "floor",
              "trade_price", "trade_date", "highest_price", "change_rate",
              "is_new_high", "is_significant_drop", "raw_data")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT ("apt_name", "size_sqm", "floor", "trade_date", "trade_price") DO NOTHING
             RETURNING "id"`,
            [
              t.regionCode,
              `${name} ${t.dongName}`,
              t.aptName,
              t.sizeSqm,
              t.floor,
              t.tradePrice,
              t.tradeDate,
              highestPrice,
              changeRate,
              isNewHigh,
              isSignificantDrop,
              JSON.stringify({}),
            ]
          );
          insertedCount += result.rows.length;
        }

        totalInserted += insertedCount;
        process.stdout.write(`  ${name}: ${transactions.length}건 수집, ${insertedCount}건 저장\n`);

        await delay(350);
      } catch (e) {
        console.error(`  ${name}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  // 4) 데일리 리포트 생성
  console.log("\n\n데일리 리포트 생성 중...");
  await generateDailyReport();

  console.log(`\n=== 수집 완료 ===`);
  console.log(`총 저장: ${totalInserted}건`);
  console.log(`신고가: ${totalNewHigh}건`);
  console.log(`폭락(20%이상): ${totalSignificantDrop}건`);

  await pool.end();
}

async function generateDailyReport() {
  const today = new Date().toISOString().split("T")[0];

  // 최근 거래 데이터 기반 리포트
  const dropsResult = await pool.query(
    `SELECT * FROM "apt_transactions"
     WHERE "change_rate" IS NOT NULL AND "change_rate" < 0
     ORDER BY "change_rate" ASC LIMIT 10`
  );
  const drops = dropsResult.rows;

  const highsResult = await pool.query(
    `SELECT * FROM "apt_transactions"
     WHERE "is_new_high" = TRUE
     ORDER BY "trade_date" DESC LIMIT 10`
  );
  const highs = highsResult.rows;

  // 거래량 상위 지역
  const cutoffDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const volumeResult = await pool.query(
    `SELECT "region_code", "region_name", COUNT(*) as count
     FROM "apt_transactions"
     WHERE "trade_date" >= $1
     GROUP BY "region_code", "region_name"
     ORDER BY count DESC LIMIT 10`,
    [cutoffDate]
  );
  const volumeSummary = volumeResult.rows.map((r) => ({
    region: (r.region_name as string)?.split(" ")[0] || r.region_code,
    count: parseInt(r.count as string, 10),
  }));

  const topDrop = drops[0];
  const title = topDrop
    ? `${topDrop.apt_name} ${Math.abs(topDrop.change_rate)}% 하락 외 | ${today} 데일리`
    : `${today} 서울 아파트 실거래 데일리`;

  await pool.query(
    `INSERT INTO "daily_reports"
     ("report_date", "title", "summary", "top_drops", "top_highs", "rate_summary", "volume_summary")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT ("report_date") DO UPDATE SET
       "title" = EXCLUDED."title",
       "summary" = EXCLUDED."summary",
       "top_drops" = EXCLUDED."top_drops",
       "top_highs" = EXCLUDED."top_highs",
       "rate_summary" = EXCLUDED."rate_summary",
       "volume_summary" = EXCLUDED."volume_summary"`,
    [
      today,
      title,
      `서울 아파트 실거래가 폭락/신고가 랭킹 및 거래량 분석`,
      JSON.stringify(drops),
      JSON.stringify(highs),
      JSON.stringify([]),
      JSON.stringify(volumeSummary),
    ]
  );

  console.log(`${today} 데일리 리포트 생성 완료`);
  console.log(`  폭락 TOP: ${drops.length}건, 신고가: ${highs.length}건`);
}

main().catch(console.error);
