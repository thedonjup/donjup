/**
 * 전국 3년 아파트 실거래가 백필 스크립트 (서울/경북 제외)
 *
 * 실행: NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/backfill-nationwide-3yr.ts [시도코드]
 *
 * 특징:
 * - SSL 인증서 문제 우회 (data.go.kr)
 * - 429 Rate Limit 자동 감지 및 대기
 * - 진행 상태 파일로 저장/복원 (중단 후 재개 가능)
 * - 500건씩 배치 INSERT
 *
 * 예시:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/backfill-nationwide-3yr.ts       # 전체 (서울/경북 제외)
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/backfill-nationwide-3yr.ts 26    # 부산만
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/backfill-nationwide-3yr.ts 41    # 경기만
 */

import { Pool } from "pg";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL!;
const MOLIT_API_KEY = process.env.MOLIT_API_KEY!;

if (!DATABASE_URL || !MOLIT_API_KEY) {
  console.error("Missing env: DATABASE_URL, MOLIT_API_KEY");
  process.exit(1);
}

// Disable TLS verification for data.go.kr certificate issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 3,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 15_000,
});

// ── Region codes (excluding Seoul=11, Gyeongbuk=47 which already have data) ──

const REGIONS_TO_BACKFILL: Record<string, Record<string, string>> = {
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
    "41111": "수원시장안구", "41113": "수원시권선구", "41115": "수원시팔달구", "41117": "수원시영통구",
    "41131": "성남시수정구", "41133": "성남시중원구", "41135": "성남시분당구",
    "41150": "의정부시", "41171": "안양시만안구", "41173": "안양시동안구",
    "41190": "부천시", "41210": "광명시", "41220": "평택시", "41250": "동두천시",
    "41271": "안산시상록구", "41273": "안산시단원구",
    "41281": "고양시덕양구", "41285": "고양시일산동구", "41287": "고양시일산서구",
    "41290": "과천시", "41310": "구리시", "41360": "남양주시", "41370": "오산시",
    "41390": "시흥시", "41410": "군포시", "41430": "의왕시", "41450": "하남시",
    "41461": "용인시처인구", "41463": "용인시기흥구", "41465": "용인시수지구",
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
    "43110": "청주시상당구", "43111": "청주시서원구", "43112": "청주시흥덕구", "43113": "청주시청원구",
    "43130": "충주시", "43150": "제천시",
    "43720": "보은군", "43730": "옥천군", "43740": "영동군", "43745": "증평군",
    "43750": "진천군", "43760": "괴산군", "43770": "음성군", "43800": "단양군",
  },
  "44": { // 충남
    "44131": "천안시동남구", "44133": "천안시서북구", "44150": "공주시", "44180": "보령시",
    "44200": "아산시", "44210": "서산시", "44230": "논산시", "44250": "계룡시", "44270": "당진시",
    "44710": "금산군", "44760": "부여군", "44770": "서천군", "44790": "청양군",
    "44800": "홍성군", "44810": "예산군", "44825": "태안군",
  },
  "45": { // 전북
    "45111": "전주시완산구", "45113": "전주시덕진구", "45130": "군산시", "45140": "익산시",
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
  "48": { // 경남
    "48121": "창원시의창구", "48123": "창원시성산구", "48125": "창원시마산합포구",
    "48127": "창원시마산회원구", "48129": "창원시진해구",
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
  "26": "부산", "27": "대구", "28": "인천", "29": "광주",
  "30": "대전", "31": "울산", "36": "세종", "41": "경기", "42": "강원",
  "43": "충북", "44": "충남", "45": "전북", "46": "전남", "48": "경남", "50": "제주",
};

const API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

// ── Progress tracking ──

const PROGRESS_FILE = path.resolve(process.cwd(), "scripts/.backfill-progress.json");

interface Progress {
  completed: Set<string>; // "regionCode:YYYYMM"
  totalInserted: number;
  errors: string[];
  rateLimitHits: number;
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
      return {
        completed: new Set(raw.completed || []),
        totalInserted: raw.totalInserted || 0,
        errors: raw.errors || [],
        rateLimitHits: raw.rateLimitHits || 0,
      };
    }
  } catch {}
  return { completed: new Set(), totalInserted: 0, errors: [], rateLimitHits: 0 };
}

function saveProgress(progress: Progress) {
  const data = {
    completed: Array.from(progress.completed),
    totalInserted: progress.totalInserted,
    errors: progress.errors.slice(-100), // Keep last 100 errors
    rateLimitHits: progress.rateLimitHits,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

// ── HTTP fetch with retry and rate-limit handling ──

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "DonJup/1.0" }, rejectUnauthorized: false }, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
    });
    req.on("error", (e: Error) => reject(e));
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
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

async function fetchTransactions(regionCode: string, dealYearMonth: string): Promise<Transaction[] | "RATE_LIMITED"> {
  const url = `${API_BASE}?serviceKey=${MOLIT_API_KEY}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYearMonth}&pageNo=1&numOfRows=9999`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { status, body } = await httpGet(url);

      if (status === 429) {
        return "RATE_LIMITED";
      }

      if (status !== 200) {
        throw new Error(`HTTP ${status}`);
      }

      const resultCode = extractTag(body, "resultCode");
      if (resultCode && resultCode !== "000" && resultCode !== "00") {
        const msg = extractTag(body, "resultMsg") || "Unknown";
        if (msg.includes("LIMITED") || msg.includes("quota")) return "RATE_LIMITED";
        return [];
      }

      const itemMatches = body.match(/<item>([\s\S]*?)<\/item>/g);
      if (!itemMatches) return [];

      const items: Transaction[] = [];
      for (const itemXml of itemMatches) {
        const rawPrice = extractTag(itemXml, "dealAmount")?.trim();
        const year = extractTag(itemXml, "dealYear")?.trim();
        const month = extractTag(itemXml, "dealMonth")?.trim();
        const dayStr = extractTag(itemXml, "dealDay")?.trim();
        const dong = extractTag(itemXml, "umdNm")?.trim();
        const aptName = extractTag(itemXml, "aptNm")?.trim();
        const size = extractTag(itemXml, "excluUseAr")?.trim();
        const floor = extractTag(itemXml, "floor")?.trim();
        const builtYear = extractTag(itemXml, "buildYear")?.trim();
        const dealType = extractTag(itemXml, "dealingGbn")?.trim() || "";

        if (!rawPrice || !year || !month || !dayStr || !aptName || !size) continue;

        items.push({
          regionCode,
          dongName: dong || "",
          aptName,
          sizeSqm: parseFloat(size),
          floor: parseInt(floor || "0", 10),
          tradePrice: parseInt(rawPrice.replace(/,/g, ""), 10),
          tradeDate: `${year}-${month.padStart(2, "0")}-${dayStr.padStart(2, "0")}`,
          builtYear: parseInt(builtYear || "0", 10),
          dealType,
        });
      }

      return items;
    } catch (e) {
      if (attempt < 2) {
        await delay(2000 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }

  return [];
}

// ── DB operations ──

async function upsertTransactions(transactions: Transaction[], regionName: string): Promise<number> {
  if (transactions.length === 0) return 0;

  let totalInserted = 0;

  // Batch in chunks of 500
  for (let i = 0; i < transactions.length; i += 500) {
    const chunk = transactions.slice(i, i + 500);
    const cols = [
      "region_code", "region_name", "apt_name", "size_sqm", "floor",
      "trade_price", "trade_date", "deal_type", "highest_price",
      "change_rate", "is_new_high", "is_significant_drop", "raw_data",
    ];

    const values: any[] = [];
    const rowPlaceholders: string[] = [];

    chunk.forEach((t, ri) => {
      const ps = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`);
      rowPlaceholders.push(`(${ps.join(",")})`);
      values.push(
        t.regionCode,
        `${regionName} ${t.dongName}`,
        t.aptName,
        t.sizeSqm,
        t.floor,
        t.tradePrice,
        t.tradeDate,
        t.dealType || null,
        null, // highest_price
        null, // change_rate
        false, // is_new_high
        false, // is_significant_drop
        JSON.stringify({}), // raw_data
      );
    });

    const sql = `INSERT INTO apt_transactions (${cols.join(",")}) VALUES ${rowPlaceholders.join(",")}
      ON CONFLICT (apt_name,size_sqm,floor,trade_date,trade_price) DO NOTHING`;

    try {
      const result = await pool.query(sql, values);
      totalInserted += result.rowCount || 0;
    } catch (e: any) {
      // Log but don't throw - partial success is OK
      console.error(`  DB error: ${e.message?.substring(0, 100)}`);
    }
  }

  return totalInserted;
}

async function upsertComplexes(transactions: Transaction[], regionName: string) {
  const seen = new Set<string>();
  const complexes: any[] = [];

  for (const t of transactions) {
    const key = `${t.regionCode}-${t.aptName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    complexes.push({
      region_code: t.regionCode,
      region_name: regionName,
      dong_name: t.dongName,
      apt_name: t.aptName,
      built_year: t.builtYear || null,
      slug: `${t.regionCode}-${toSlug(t.aptName)}`,
    });
  }

  if (complexes.length === 0) return;

  // Batch insert complexes
  for (let i = 0; i < complexes.length; i += 200) {
    const chunk = complexes.slice(i, i + 200);
    const cols = ["region_code", "region_name", "dong_name", "apt_name", "built_year", "slug"];
    const values: any[] = [];
    const rowPlaceholders: string[] = [];

    chunk.forEach((c, ri) => {
      const ps = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`);
      rowPlaceholders.push(`(${ps.join(",")})`);
      values.push(c.region_code, c.region_name, c.dong_name, c.apt_name, c.built_year, c.slug);
    });

    const sql = `INSERT INTO apt_complexes (${cols.join(",")}) VALUES ${rowPlaceholders.join(",")}
      ON CONFLICT (slug) DO NOTHING`;

    try {
      await pool.query(sql, values);
    } catch {}
  }
}

// ── Generate month list ──

function generateMonths(startYear: number, startMonth: number, endYear: number, endMonth: number): string[] {
  const months: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const mStart = y === startYear ? startMonth : 1;
    const mEnd = y === endYear ? endMonth : 12;
    for (let m = mStart; m <= mEnd; m++) {
      months.push(`${y}${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

// ── Main ──

async function main() {
  const sidoFilter = process.argv[2] || null;

  // 3 years: 2023-04 to 2026-03
  const months = generateMonths(2023, 4, 2026, 3);

  // Build work list
  const targetSidos = sidoFilter
    ? { [sidoFilter]: REGIONS_TO_BACKFILL[sidoFilter] }
    : REGIONS_TO_BACKFILL;

  if (sidoFilter && !REGIONS_TO_BACKFILL[sidoFilter]) {
    console.error(`Invalid sido code: ${sidoFilter}. Available: ${Object.keys(REGIONS_TO_BACKFILL).join(", ")}`);
    process.exit(1);
  }

  type WorkItem = { code: string; name: string; ym: string };
  const workItems: WorkItem[] = [];

  for (const [sidoCode, sigungu] of Object.entries(targetSidos)) {
    if (!sigungu) continue;
    const sidoName = SIDO_NAMES[sidoCode] || sidoCode;
    for (const [code, sgName] of Object.entries(sigungu)) {
      for (const ym of months) {
        workItems.push({ code, name: `${sidoName} ${sgName}`, ym });
      }
    }
  }

  const progress = loadProgress();
  const remaining = workItems.filter((w) => !progress.completed.has(`${w.code}:${w.ym}`));

  console.log(`=== Nationwide 3-Year Backfill ===`);
  console.log(`Target: ${sidoFilter ? SIDO_NAMES[sidoFilter] : "All (excl Seoul/Gyeongbuk)"}`);
  console.log(`Period: 2023-04 ~ 2026-03 (${months.length} months)`);
  console.log(`Total work items: ${workItems.length}`);
  console.log(`Already completed: ${workItems.length - remaining.length}`);
  console.log(`Remaining: ${remaining.length}`);
  console.log(`Previous insertions: ${progress.totalInserted}`);
  console.log(`Rate limit hits so far: ${progress.rateLimitHits}`);
  console.log(``);

  if (remaining.length === 0) {
    console.log("All items already completed!");
    await pool.end();
    return;
  }

  let apiCalls = 0;
  let sessionInserted = 0;

  for (let i = 0; i < remaining.length; i++) {
    const { code, name, ym } = remaining[i];

    try {
      const result = await fetchTransactions(code, ym);
      apiCalls++;

      if (result === "RATE_LIMITED") {
        progress.rateLimitHits++;
        saveProgress(progress);
        console.log(`\n** RATE LIMITED after ${apiCalls} calls this session. **`);
        console.log(`   Completed ${progress.completed.size} / ${workItems.length} total.`);
        console.log(`   Session inserted: ${sessionInserted} rows.`);
        console.log(`   Re-run this script to continue from where it left off.`);
        console.log(`   data.go.kr daily limit resets at midnight KST.\n`);
        break;
      }

      if (result.length > 0) {
        const inserted = await upsertTransactions(result, name);
        await upsertComplexes(result, name);
        sessionInserted += inserted;
        progress.totalInserted += inserted;
      }

      progress.completed.add(`${code}:${ym}`);

      // Progress log every 10 items
      if ((i + 1) % 10 === 0 || result.length > 100) {
        const pct = ((progress.completed.size / workItems.length) * 100).toFixed(1);
        process.stdout.write(
          `  [${progress.completed.size}/${workItems.length}] ${pct}% | ${name} ${ym}: ${result.length} txns | session: +${sessionInserted}\n`
        );
      }

      // Save progress every 50 items
      if ((i + 1) % 50 === 0) {
        saveProgress(progress);
      }

      await delay(350); // Rate limit protection
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      progress.errors.push(`${name}(${ym}): ${msg}`);
      console.error(`  ERROR: ${name} ${ym}: ${msg.substring(0, 100)}`);
      await delay(2000);
    }
  }

  saveProgress(progress);

  console.log(`\n=== Session Summary ===`);
  console.log(`API calls this session: ${apiCalls}`);
  console.log(`Rows inserted this session: ${sessionInserted}`);
  console.log(`Total completed: ${progress.completed.size} / ${workItems.length}`);
  console.log(`Total inserted (all sessions): ${progress.totalInserted}`);
  console.log(`Errors: ${progress.errors.length}`);
  if (progress.errors.length > 0) {
    console.log(`Last errors: ${progress.errors.slice(-5).join("\n  ")}`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
