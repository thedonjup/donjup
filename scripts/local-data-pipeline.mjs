import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Pool } = pg;

const DEFAULT_LOCAL_DATA_DIR = ".donjup-local-data";
const SALE_FILE = "sale-transactions.jsonl";
const RENT_FILE = "rent-transactions.jsonl";
const MANIFEST_FILE = "manifest.json";
const DEFAULT_MONTH_COUNT = 1;
const MAX_MONTH_COUNT = 6;
const REQUEST_DELAY_MS = 300;
const UPLOAD_BATCH_SIZE = 500;
const SIGNAL_UPDATE_BATCH_SIZE = 250;
const DEFAULT_GEOCODE_BATCH_SIZE = 120;
const MAX_GEOCODE_BATCH_SIZE = 500;
const DEFAULT_GEOCODE_DELAY_MS = 80;
const DEFAULT_GEOCODE_MAX_RETRIES = 2;
const DEFAULT_GEOCODE_TIMEOUT_MS = 15_000;
const APT_PROPERTY_TYPE = 1;
const SIGNIFICANT_DROP_RATE = -20;

const GEOCODE_REGION_HINTS = [
  { dong: "감정동", region: "경기 김포" },
  { dong: "양벌동", region: "경기 광주" },
  { dong: "신현동", region: "경기 광주" },
  { dong: "쌍령동", region: "경기 광주" },
  { dong: "태전동", region: "경기 광주" },
  { dong: "강내면 월곡리", region: "충북 청주" },
];

const BATCH_GROUPS = {
  0: ["11", "26", "27"],
  1: ["28", "29", "30", "31", "36"],
  2: ["41"],
  3: ["42", "43", "44", "45"],
  4: ["46", "47", "48", "50"],
};

const REQUIRED_TABLES = [
  "apt_complexes",
  "apt_transactions",
  "apt_rent_transactions",
  "finance_rates",
  "daily_reports",
  "page_views",
  "content_queue",
  "seeding_queue",
  "push_subscriptions",
  "reb_price_indices",
  "homepage_cache",
  "analytics_daily",
  "instagram_posts",
];

const SALE_API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";
const RENT_API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

let cachedRegionHierarchy = null;

export function loadEnvFile(filePath = resolve(process.cwd(), ".env.local")) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}

export function localDataDir() {
  return resolve(
    process.cwd(),
    process.env.DONJUP_LOCAL_DATA_DIR || DEFAULT_LOCAL_DATA_DIR
  );
}

function ensureLocalDataDir() {
  const dir = localDataDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

function dataFilePath(fileName) {
  return resolve(ensureLocalDataDir(), fileName);
}

function runsDir() {
  const dir = resolve(ensureLocalDataDir(), "runs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function runTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function runPath(prefix, extension) {
  return resolve(runsDir(), `${prefix}-${runTimestamp()}.${extension}`);
}

function parseArgs(argv) {
  const [command = "status", ...rest] = argv;
  const options = {};

  for (const arg of rest) {
    if (!arg.startsWith("--")) continue;

    const [key, value] = arg.slice(2).split("=", 2);
    options[key] = value ?? "true";
  }

  return { command, options };
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;

  return Math.min(parsed, max);
}

function parseNonNegativeInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return fallback;

  return Math.min(parsed, max);
}

function parseBooleanOption(value, fallback = true) {
  if (value === undefined) return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;

  return fallback;
}

function getSeoulYearMonth(baseDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(baseDate);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  return { year, monthIndex: month - 1 };
}

export function getRecentYearMonths(count, baseDate = new Date()) {
  const { year, monthIndex } = getSeoulYearMonth(baseDate);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex - index, 1));
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");

    return `${date.getUTCFullYear()}${month}`;
  });
}

function loadRegionHierarchy() {
  if (cachedRegionHierarchy) return cachedRegionHierarchy;

  const source = readFileSync(
    resolve(process.cwd(), "src/lib/constants/region-codes.ts"),
    "utf8"
  );
  const match = source.match(/export const REGION_HIERARCHY[^=]*=\s*({[\s\S]*?\n};)/);
  if (!match) {
    throw new Error("REGION_HIERARCHY를 찾을 수 없습니다.");
  }

  const objectLiteral = match[1].replace(/;$/, "");
  cachedRegionHierarchy = Function(`"use strict"; return (${objectLiteral});`)();
  return cachedRegionHierarchy;
}

function regionNameFromCode(regionCode) {
  const code = String(regionCode || "");
  if (code.length < 5) return null;

  const hierarchy = loadRegionHierarchy();
  const sido = hierarchy[code.slice(0, 2)];
  const sigunguName = sido?.sigungu?.[code];
  if (!sido || !sigunguName) return null;

  return `${sido.shortName} ${sigunguName}`;
}

function regionEntriesForOptions(options) {
  const hierarchy = loadRegionHierarchy();

  if (options.region) {
    const regionCode = String(options.region);
    const sido = hierarchy[regionCode.slice(0, 2)];
    const sigunguName = sido?.sigungu?.[regionCode];
    if (!sido || !sigunguName) {
      throw new Error(`Unknown region code: ${regionCode}`);
    }

    return [[regionCode, `${sido.shortName} ${sigunguName}`]];
  }

  const sidoCodes = options.batch !== undefined
    ? BATCH_GROUPS[Number(options.batch)]
    : options.sido
      ? [String(options.sido)]
      : Object.keys(hierarchy);

  if (!sidoCodes || sidoCodes.length === 0) {
    throw new Error("Invalid --batch or --sido option");
  }

  const entries = [];
  for (const sidoCode of sidoCodes) {
    const sido = hierarchy[sidoCode];
    if (!sido) throw new Error(`Unknown sido code: ${sidoCode}`);

    for (const [regionCode, sigunguName] of Object.entries(sido.sigungu)) {
      entries.push([regionCode, `${sido.shortName} ${sigunguName}`]);
    }
  }

  return entries;
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function parseXmlItems(xml) {
  const resultCode = extractTag(xml, "resultCode");
  if (resultCode && resultCode !== "000" && resultCode !== "00") {
    const resultMsg = extractTag(xml, "resultMsg") || "Unknown MOLIT API error";
    throw new Error(`[${resultCode}] ${resultMsg}`);
  }

  return xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
}

function parseSaleXml(xml, regionCode) {
  return parseXmlItems(xml).flatMap((itemXml) => {
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
    const aptSeq = extractTag(itemXml, "aptSeq")?.trim() || "";

    if (!rawPrice || !year || !month || !day || !aptName || !size) return [];

    return [{
      kind: "sale",
      regionCode,
      dongName: dong || "",
      aptName,
      aptSeq,
      sizeSqm: Number(size),
      floor: Number(floor || "0"),
      tradePrice: Number(rawPrice.replace(/,/g, "")),
      tradeDate: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
      builtYear: Number(builtYear || "0"),
      dealType,
      rawData: {
        dealAmount: rawPrice,
        buildYear: builtYear || "",
        dealYear: year,
        dealMonth: month,
        dealDay: day,
        umdNm: dong || "",
        aptNm: aptName,
        excluUseAr: size,
        floor: floor || "",
        sggCd: regionCode,
        dealingGbn: dealType,
        aptSeq,
      },
    }];
  });
}

function parseRentXml(xml, regionCode) {
  return parseXmlItems(xml).flatMap((itemXml) => {
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

    if (!aptName || !size || !year || !month || !day || !rawDeposit) return [];

    const monthlyRent = rawMonthlyRent
      ? Number(rawMonthlyRent.replace(/,/g, ""))
      : 0;
    const preDeposit = rawPreDeposit
      ? Number(rawPreDeposit.replace(/,/g, ""))
      : null;
    const preMonthlyRent = rawPreMonthlyRent
      ? Number(rawPreMonthlyRent.replace(/,/g, ""))
      : null;

    return [{
      kind: "rent",
      regionCode,
      dongName: dong || "",
      aptName,
      sizeSqm: Number(size),
      floor: Number(floor || "0"),
      deposit: Number(rawDeposit.replace(/,/g, "")),
      monthlyRent,
      rentType: monthlyRent > 0 ? "월세" : "전세",
      contractType,
      contractTerm,
      tradeDate: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
      builtYear: Number(builtYear || "0"),
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
    }];
  });
}

async function fetchMolitRows(kind, regionCode, dealYearMonth) {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    throw new Error("MOLIT_API_KEY is required");
  }

  const baseUrl = kind === "rent" ? RENT_API_BASE : SALE_API_BASE;
  const url = `${baseUrl}?serviceKey=${apiKey}&LAWD_CD=${regionCode}&DEAL_YMD=${dealYearMonth}&pageNo=1&numOfRows=9999`;
  const response = await fetch(url, {
    headers: { "User-Agent": "DonJup/1.0" },
  });

  if (!response.ok) {
    throw new Error(`MOLIT ${kind} API failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return kind === "rent"
    ? parseRentXml(xml, regionCode)
    : parseSaleXml(xml, regionCode);
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function appendJsonLines(fileName, rows) {
  if (rows.length === 0) return;

  const body = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  await appendFile(dataFilePath(fileName), body, "utf8");
}

async function updateManifest(update) {
  const manifestPath = dataFilePath(MANIFEST_FILE);
  let manifest = {};

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    manifest = {};
  }

  const nextManifest = {
    ...manifest,
    ...update,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(manifestPath, JSON.stringify(nextManifest, null, 2), "utf8");
}

async function collect(options) {
  const kinds = options.kind === "both" || !options.kind
    ? ["sale", "rent"]
    : [options.kind];

  for (const kind of kinds) {
    if (!["sale", "rent"].includes(kind)) {
      throw new Error(`Invalid --kind: ${kind}`);
    }
  }

  const months = options.ym
    ? String(options.ym).split(",").map((value) => value.trim()).filter(Boolean)
    : getRecentYearMonths(
        parsePositiveInt(options.months, DEFAULT_MONTH_COUNT, MAX_MONTH_COUNT)
      );
  const regionEntries = regionEntriesForOptions(options);
  const limitRegions = parsePositiveInt(options["limit-regions"], regionEntries.length);
  const selectedRegionEntries = regionEntries.slice(0, limitRegions);
  const collectedAt = new Date().toISOString();
  const summary = {
    sale: 0,
    rent: 0,
    requests: 0,
    errors: [],
  };

  ensureLocalDataDir();

  for (const kind of kinds) {
    for (const [regionCode, regionName] of selectedRegionEntries) {
      for (const dealYearMonth of months) {
        try {
          const rows = (await fetchMolitRows(kind, regionCode, dealYearMonth))
            .map((row) => ({
              ...row,
              regionName,
              dealYearMonth,
              collectedAt,
            }));
          await appendJsonLines(kind === "rent" ? RENT_FILE : SALE_FILE, rows);
          summary[kind] += rows.length;
          summary.requests += 1;
          console.log(`${kind} ${regionCode} ${dealYearMonth}: ${rows.length}`);
        } catch (error) {
          const message = `${kind} ${regionCode} ${dealYearMonth}: ${error.message}`;
          summary.errors.push(message);
          console.error(message);
        }

        await delay(REQUEST_DELAY_MS);
      }
    }
  }

  await updateManifest({
    lastCollect: {
      collectedAt,
      kinds,
      months,
      regions: selectedRegionEntries.length,
      summary,
    },
  });

  console.log(JSON.stringify(summary, null, 2));
}

function readJsonLines(fileName) {
  const path = dataFilePath(fileName);
  if (!existsSync(path)) return [];

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function saleTransactionId(row) {
  return [
    row.regionCode,
    row.aptName,
    row.sizeSqm,
    row.tradeDate,
    row.tradePrice,
    row.floor,
  ].join("-");
}

export function rentTransactionId(row) {
  const signature = JSON.stringify([
    row.regionCode,
    row.dongName,
    row.aptName,
    row.sizeSqm,
    row.floor,
    row.deposit,
    row.monthlyRent,
    row.rentType,
    row.contractType,
    row.tradeDate,
    row.preDeposit,
    row.preMonthlyRent,
  ]);

  return `rent:${createHash("sha256").update(signature).digest("hex")}`;
}

export function rentDbUniqueKey(row) {
  return JSON.stringify([
    row.aptName,
    normalizeNumericKey(row.sizeSqm),
    row.floor,
    row.tradeDate,
    row.deposit,
    row.monthlyRent,
  ]);
}

function normalizeDbDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function normalizeNumericKey(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(value ?? "");
}

function dbRentLookupKey(row) {
  return JSON.stringify([
    row.apt_name,
    normalizeNumericKey(row.size_sqm),
    row.floor,
    normalizeDbDate(row.trade_date),
    row.deposit,
    row.monthly_rent,
  ]);
}

function makeSlug(regionCode, aptName) {
  const nameSlug = aptName
    .replace(/[^가-힣a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${regionCode}-${nameSlug}`;
}

function makeRentComplexSlug(regionCode, dongName, aptName) {
  return makeSlug(regionCode, [dongName, aptName].filter(Boolean).join("-"));
}

function complexNaturalKey(row) {
  return JSON.stringify([
    row.regionCode,
    row.dongName || "",
    row.aptName,
    APT_PROPERTY_TYPE,
  ]);
}

function normalizeGovtComplexId(regionCode, aptSeq) {
  const trimmed = aptSeq?.trim();
  if (!trimmed) return null;

  const prefix = `${regionCode}-`;
  const cleanSeq = trimmed.startsWith(prefix)
    ? trimmed.slice(prefix.length)
    : trimmed;

  return `${regionCode}-${cleanSeq}`;
}

function uniqueById(rows, idFn) {
  const unique = new Map();
  for (const row of rows) {
    unique.set(idFn(row), row);
  }

  return [...unique.values()];
}

export function buildRentReconcilePlan(localRows, dbRows) {
  const localById = new Map();
  for (const row of localRows) {
    localById.set(rentTransactionId(row), row);
  }

  const dbIds = new Set(dbRows.map((row) => row.id));
  const dbCurrentUniqueKeys = new Set(dbRows.map(dbRentLookupKey));
  const missing = [];

  for (const [id, row] of localById.entries()) {
    if (!dbIds.has(id)) {
      missing.push({
        id,
        row,
        blockedByCurrentUnique: dbCurrentUniqueKeys.has(rentDbUniqueKey(row)),
      });
    }
  }

  return {
    localRows: localRows.length,
    localUniqueRows: localById.size,
    dbRows: dbRows.length,
    missing,
    missingBlockedByCurrentUnique: missing.filter((item) => item.blockedByCurrentUnique).length,
    missingNoCurrentUniqueConflict: missing.filter((item) => !item.blockedByCurrentUnique).length,
  };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function normalizeSearchPart(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAptName(value) {
  return normalizeSearchPart(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[^가-힣a-zA-Z0-9\s]/g, "")
    .trim();
}

function pushUniqueQuery(queries, query) {
  const normalized = {
    ...query,
    query: normalizeSearchPart(query.query),
  };

  if (!normalized.query) return;
  if (queries.some((item) => item.type === normalized.type && item.query === normalized.query)) {
    return;
  }

  queries.push(normalized);
}

export function buildGeocodeQueries(complex) {
  const queries = [];
  const regionName = normalizeSearchPart(
    regionNameFromCode(complex.region_code ?? complex.regionCode) ?? complex.region_name
  );
  const rawDongName = normalizeSearchPart(complex.dong_name);
  const dongName = rawDongName.replace(/\s*(읍|면)\s+\S+리$/, "");
  const aptName = normalizeSearchPart(complex.apt_name);
  const cleanedName = cleanAptName(aptName);

  pushUniqueQuery(queries, {
    strategy: "keyword_region_dong_apt",
    type: "keyword",
    query: `${regionName} ${dongName} ${cleanedName} 아파트`,
  });
  pushUniqueQuery(queries, {
    strategy: "address",
    type: "address",
    query: complex.address,
  });
  pushUniqueQuery(queries, {
    strategy: "keyword_region_apt",
    type: "keyword",
    query: `${regionName} ${cleanedName}`,
  });
  pushUniqueQuery(queries, {
    strategy: "keyword_dong_raw",
    type: "keyword",
    query: `${dongName} ${aptName}`,
  });
  pushUniqueQuery(queries, {
    strategy: "keyword_full",
    type: "keyword",
    query: `${regionName} ${dongName} ${cleanedName}`,
  });
  pushUniqueQuery(queries, {
    strategy: "keyword_no_apt_suffix",
    type: "keyword",
    query: `${dongName} ${cleanedName}`,
  });
  pushUniqueQuery(queries, {
    strategy: "keyword_dong_center",
    type: "keyword",
    query: `${regionName} ${dongName}`,
  });
  for (const hint of GEOCODE_REGION_HINTS) {
    if (!rawDongName.includes(hint.dong)) continue;

    pushUniqueQuery(queries, {
      strategy: "keyword_hint_region_dong_apt",
      type: "keyword",
      query: `${hint.region} ${rawDongName} ${cleanedName} 아파트`,
    });
    pushUniqueQuery(queries, {
      strategy: "keyword_hint_region_dong",
      type: "keyword",
      query: `${hint.region} ${rawDongName}`,
    });
  }

  return queries;
}

export function isRateLimitedGeocodeStatus(status) {
  return status === 403 || status === 429;
}

function isKoreaCoordinate(lat, lng) {
  return lat >= 32 && lat <= 39.5 && lng >= 123 && lng <= 132.5;
}

export function calcDropLevel(changeRate) {
  if (changeRate === null) return "normal";
  if (changeRate <= -20) return "severe";
  if (changeRate <= -15) return "crash";
  if (changeRate <= -10) return "decline";
  return "normal";
}

export function calculateSignalUpdates(rows) {
  const ordered = [...rows].sort((left, right) => {
    const groupCompare = `${left.region_code ?? ""}|${left.apt_name}|${left.size_sqm}`
      .localeCompare(`${right.region_code ?? ""}|${right.apt_name}|${right.size_sqm}`);
    if (groupCompare !== 0) return groupCompare;
    const dateCompare = String(left.trade_date).localeCompare(String(right.trade_date));
    if (dateCompare !== 0) return dateCompare;
    return String(left.id).localeCompare(String(right.id));
  });

  const updates = [];
  let currentGroup = "";
  let runningMax = 0;

  for (const row of ordered) {
    const groupKey = `${row.region_code ?? ""}|${row.apt_name}|${row.size_sqm}`;
    if (groupKey !== currentGroup) {
      currentGroup = groupKey;
      runningMax = 0;
    }

    const tradePrice = Number(row.trade_price);
    const prevHighest = runningMax;
    const isNewHigh = tradePrice > prevHighest && prevHighest > 0;
    const highestPrice = Math.max(prevHighest, tradePrice);
    let changeRate = null;

    if (prevHighest > 0 && !isNewHigh) {
      changeRate = Number((((tradePrice - prevHighest) / prevHighest) * 100).toFixed(2));
    }

    updates.push({
      id: row.id,
      highest_price: highestPrice,
      change_rate: changeRate,
      is_new_high: isNewHigh,
      is_significant_drop: changeRate !== null && changeRate <= SIGNIFICANT_DROP_RATE,
      drop_level: calcDropLevel(changeRate),
    });

    runningMax = highestPrice;
  }

  return updates;
}

async function dbPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
}

async function verifyDatabase(pool) {
  const tablesResult = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public'"
  );
  const tables = new Set(tablesResult.rows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((table) => !tables.has(table));

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  await pool.query("select 1");
  return { ok: true, missing: [] };
}

async function verifyDbCommand() {
  const pool = await dbPool();
  try {
    const result = await verifyDatabase(pool);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

async function insertChunk(pool, table, columns, rows, conflictTarget) {
  if (rows.length === 0) return 0;

  let inserted = 0;

  for (let index = 0; index < rows.length; index += UPLOAD_BATCH_SIZE) {
    const chunk = rows.slice(index, index + UPLOAD_BATCH_SIZE);
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const params = columns.map((column, columnIndex) => {
        values.push(row[column]);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });

      return `(${params.join(", ")})`;
    });
    const conflict = conflictTarget
      ? `ON CONFLICT (${conflictTarget}) DO NOTHING`
      : "ON CONFLICT DO NOTHING";
    const sql = `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES ${placeholders.join(", ")}
      ${conflict}
      RETURNING 1
    `;
    const result = await pool.query(sql, values);
    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

async function fetchSignalRows(pool, regionCode) {
  const result = await pool.query(
    `SELECT id, region_code, apt_name, size_sqm, trade_price, trade_date
     FROM apt_transactions
     WHERE region_code = $1
     ORDER BY apt_name ASC, size_sqm ASC, trade_date ASC, id ASC`,
    [regionCode]
  );
  return result.rows;
}

async function fetchAllSignalRegionCodes(pool) {
  const result = await pool.query(
    `SELECT DISTINCT region_code
     FROM apt_transactions
     ORDER BY region_code ASC`
  );
  return result.rows.map((row) => row.region_code);
}

async function updateSignalChunk(pool, updates) {
  if (updates.length === 0) return 0;

  const values = [];
  const placeholders = updates.map((row, rowIndex) => {
    const base = rowIndex * 6;
    values.push(
      row.id,
      row.highest_price,
      row.change_rate,
      row.is_new_high,
      row.is_significant_drop,
      row.drop_level
    );
    return `($${base + 1}::TEXT, $${base + 2}::INT, $${base + 3}::DECIMAL, $${base + 4}::BOOL, $${base + 5}::BOOL, $${base + 6}::TEXT)`;
  });

  const result = await pool.query(
    `UPDATE apt_transactions AS t
     SET highest_price = u.highest_price,
         change_rate = u.change_rate,
         is_new_high = u.is_new_high,
         is_significant_drop = u.is_significant_drop,
         drop_level = u.drop_level
     FROM (VALUES ${placeholders.join(", ")})
       AS u(id, highest_price, change_rate, is_new_high, is_significant_drop, drop_level)
     WHERE t.id = u.id::TEXT`,
    values
  );

  return result.rowCount ?? 0;
}

async function updateSignalRows(pool, updates) {
  let applied = 0;
  for (let index = 0; index < updates.length; index += SIGNAL_UPDATE_BATCH_SIZE) {
    applied += await updateSignalChunk(pool, updates.slice(index, index + SIGNAL_UPDATE_BATCH_SIZE));
  }
  return applied;
}

async function recalculateSignals(pool, regionCodes) {
  const codes = regionCodes?.length ? [...new Set(regionCodes)].sort() : await fetchAllSignalRegionCodes(pool);
  const summary = {
    regionCount: codes.length,
    transactionCount: 0,
    updatedRows: 0,
    newHighRows: 0,
    changeRows: 0,
    significantDropRows: 0,
  };

  for (const regionCode of codes) {
    const rows = await fetchSignalRows(pool, regionCode);
    if (rows.length === 0) continue;

    const updates = calculateSignalUpdates(rows);
    summary.transactionCount += rows.length;
    summary.newHighRows += updates.filter((row) => row.is_new_high).length;
    summary.changeRows += updates.filter((row) => row.change_rate !== null).length;
    summary.significantDropRows += updates.filter((row) => row.is_significant_drop).length;
    summary.updatedRows += await updateSignalRows(pool, updates);
  }

  return summary;
}

async function refreshPublicCaches(options = {}) {
  const origin = options["app-origin"]
    || process.env.DONJUP_APP_ORIGIN
    || process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!origin || !cronSecret) {
    return {
      skipped: true,
      reason: !origin ? "missing-app-origin" : "missing-cron-secret",
    };
  }

  const endpoint = new URL("/api/cron/refresh-cache", origin);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
    cache: "no-store",
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // Keep non-JSON response body for diagnostics.
  }

  return {
    skipped: false,
    ok: response.ok,
    status: response.status,
    endpoint: endpoint.toString(),
    response: payload,
  };
}

function kakaoUrl(type, query) {
  const path = type === "address"
    ? "/v2/local/search/address.json"
    : "/v2/local/search/keyword.json";
  const url = new URL(path, "https://dapi.kakao.com");
  url.searchParams.set("query", query);

  return url;
}

function coordinateFromDocument(doc) {
  const lat = Number.parseFloat(String(doc?.y ?? ""));
  const lng = Number.parseFloat(String(doc?.x ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!isKoreaCoordinate(lat, lng)) return null;

  return { lat, lng };
}

function pickKakaoDocument(documents) {
  if (!Array.isArray(documents) || documents.length === 0) return null;

  return documents.find((doc) => String(doc?.category_name || "").includes("아파트"))
    ?? documents[0]
    ?? null;
}

async function fetchKakaoQuery(query, restKey, options) {
  const maxAttempts = options.maxRetries + 1;
  let lastError = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(kakaoUrl(query.type, query.query), {
        headers: { Authorization: `KakaoAK ${restKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      await sleep(options.delayMs);

      if (isRateLimitedGeocodeStatus(response.status)) {
        return {
          ok: false,
          limited: true,
          status: response.status,
          error: `Kakao geocode limited with status ${response.status}`,
          attempt,
        };
      }

      if (!response.ok) {
        lastError = `Kakao geocode failed with status ${response.status}`;
        if (response.status >= 500 && attempt < maxAttempts) {
          await sleep(options.delayMs * attempt);
          continue;
        }
        return { ok: false, status: response.status, error: lastError, attempt };
      }

      const payload = await response.json();
      const document = pickKakaoDocument(payload.documents);
      const coordinate = coordinateFromDocument(document);
      if (!coordinate) {
        return { ok: false, status: response.status, error: "no-result", attempt };
      }

      return {
        ok: true,
        status: response.status,
        strategy: query.strategy,
        query: query.query,
        lat: coordinate.lat,
        lng: coordinate.lng,
        attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < maxAttempts) {
        await sleep(options.delayMs * attempt);
        continue;
      }
    }
  }

  return { ok: false, error: lastError, attempt: maxAttempts };
}

async function geocodeComplex(complex, restKey, options) {
  const errors = [];

  for (const query of buildGeocodeQueries(complex)) {
    const result = await fetchKakaoQuery(query, restKey, options);
    if (result.ok || result.limited) return result;
    errors.push({
      strategy: query.strategy,
      type: query.type,
      status: result.status,
      error: result.error,
    });
  }

  return { ok: false, error: "all-strategies-empty", errors };
}

async function fetchGeocodeBatch(pool, afterId, limit) {
  const result = await pool.query(
    `SELECT id, region_code, address, apt_name, region_name, dong_name
     FROM apt_complexes
     WHERE (latitude IS NULL OR longitude IS NULL)
       AND id > $1::TEXT
     ORDER BY id ASC
     LIMIT $2::INT`,
    [afterId || "", limit]
  );
  return result.rows;
}

async function countUngocodedComplexes(pool) {
  const result = await pool.query(
    `SELECT count(*)::INT AS count
     FROM apt_complexes
     WHERE latitude IS NULL OR longitude IS NULL`
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function updateComplexCoordinate(pool, complexId, lat, lng) {
  const result = await pool.query(
    `UPDATE apt_complexes
     SET latitude = $2::DECIMAL,
         longitude = $3::DECIMAL,
         updated_at = NOW()
     WHERE id = $1::TEXT`,
    [complexId, lat, lng]
  );
  return result.rowCount ?? 0;
}

async function geocodeComplexesCommand(options) {
  const restKey = process.env.KAKAO_REST_KEY?.trim();
  if (!restKey) {
    throw new Error("KAKAO_REST_KEY is required");
  }

  const apply = parseBooleanOption(options.apply, true);
  const batchSize = parsePositiveInt(
    options["batch-size"],
    DEFAULT_GEOCODE_BATCH_SIZE,
    MAX_GEOCODE_BATCH_SIZE
  );
  const maxRows = parsePositiveInt(options.limit, Number.MAX_SAFE_INTEGER);
  const delayMs = parseNonNegativeInt(options["delay-ms"], DEFAULT_GEOCODE_DELAY_MS, 10_000);
  const maxRetries = parseNonNegativeInt(options["max-retries"], DEFAULT_GEOCODE_MAX_RETRIES, 10);
  const timeoutMs = parsePositiveInt(options["timeout-ms"], DEFAULT_GEOCODE_TIMEOUT_MS, 60_000);
  const stopOnRateLimit = parseBooleanOption(options["stop-on-rate-limit"], true);
  const logPath = runPath("geocode-complexes", "jsonl");
  const summaryPath = logPath.replace(/\.jsonl$/, ".json");
  const pool = await dbPool();
  const summary = {
    mode: apply ? "apply" : "dry-run",
    batchSize,
    maxRows,
    delayMs,
    maxRetries,
    timeoutMs,
    stopOnRateLimit,
    startedAt: new Date().toISOString(),
    logPath,
    summaryPath,
    remainingBefore: 0,
    remainingAfter: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    limited: false,
    stopReason: null,
    lastSeenId: options["after-id"] || "",
    samples: [],
  };

  try {
    summary.remainingBefore = await countUngocodedComplexes(pool);
    while (summary.processed < maxRows) {
      const limit = Math.min(batchSize, maxRows - summary.processed);
      const complexes = await fetchGeocodeBatch(pool, summary.lastSeenId, limit);
      if (complexes.length === 0) {
        summary.stopReason = "complete";
        break;
      }

      for (const complex of complexes) {
        summary.lastSeenId = complex.id;
        const result = await geocodeComplex(complex, restKey, { delayMs, maxRetries, timeoutMs });
        summary.processed += 1;

        if (result.limited) {
          summary.limited = true;
          summary.stopReason = "rate-limited";
          await appendFile(logPath, `${JSON.stringify({
            id: complex.id,
            status: "limited",
            error: result.error,
            httpStatus: result.status,
            checkedAt: new Date().toISOString(),
          })}\n`);
          if (stopOnRateLimit) break;
        } else if (result.ok) {
          let rowCount = 0;
          if (apply) {
            rowCount = await updateComplexCoordinate(pool, complex.id, result.lat, result.lng);
          }
          summary.updated += rowCount;
          await appendFile(logPath, `${JSON.stringify({
            id: complex.id,
            status: apply ? "updated" : "matched",
            strategy: result.strategy,
            query: result.query,
            lat: result.lat,
            lng: result.lng,
            checkedAt: new Date().toISOString(),
          })}\n`);
        } else {
          summary.skipped += 1;
          const entry = {
            id: complex.id,
            aptName: complex.apt_name,
            regionName: complex.region_name,
            status: "skipped",
            error: result.error,
          };
          if (summary.samples.length < 20) summary.samples.push(entry);
          await appendFile(logPath, `${JSON.stringify({
            ...entry,
            checkedAt: new Date().toISOString(),
          })}\n`);
        }
      }

      if (summary.limited && stopOnRateLimit) break;
    }

    summary.remainingAfter = await countUngocodedComplexes(pool);
    if (!summary.stopReason) {
      summary.stopReason = summary.processed >= maxRows ? "limit-reached" : "complete";
    }
    if (summary.updated > 0 && options["refresh-cache"] !== "false") {
      summary.cacheRefresh = await refreshPublicCaches(options);
    }
    summary.finishedAt = new Date().toISOString();
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (summary.limited && stopOnRateLimit) process.exitCode = 75;
  } finally {
    await pool.end();
  }
}

export function complexRows(saleRows, rentRows = []) {
  const complexes = new Map();
  const naturalKeys = new Set();

  for (const row of saleRows) {
    const govtComplexId = normalizeGovtComplexId(row.regionCode, row.aptSeq);
    const slug = govtComplexId ?? makeSlug(row.regionCode, row.aptName);
    naturalKeys.add(complexNaturalKey(row));
    complexes.set(slug, {
      id: slug,
      region_code: row.regionCode,
      region_name: row.regionName,
      dong_name: row.dongName,
      apt_name: row.aptName,
      built_year: row.builtYear || null,
      slug,
      govt_complex_id: govtComplexId,
      property_type: APT_PROPERTY_TYPE,
    });
  }

  for (const row of rentRows) {
    const naturalKey = complexNaturalKey(row);
    if (naturalKeys.has(naturalKey)) continue;

    const slug = makeRentComplexSlug(row.regionCode, row.dongName, row.aptName);
    naturalKeys.add(naturalKey);
    complexes.set(slug, {
      id: slug,
      region_code: row.regionCode,
      region_name: row.regionName,
      dong_name: row.dongName || null,
      apt_name: row.aptName,
      built_year: row.builtYear || null,
      slug,
      govt_complex_id: null,
      property_type: APT_PROPERTY_TYPE,
    });
  }

  return [...complexes.values()];
}

function saleDbRows(saleRows) {
  return saleRows.map((row) => {
    const govtComplexId = normalizeGovtComplexId(row.regionCode, row.aptSeq);
    const slug = govtComplexId ?? makeSlug(row.regionCode, row.aptName);

    return {
      id: saleTransactionId(row),
      complex_id: slug,
      region_code: row.regionCode,
      region_name: row.regionName,
      apt_name: row.aptName,
      size_sqm: String(row.sizeSqm),
      floor: row.floor,
      trade_price: row.tradePrice,
      trade_date: row.tradeDate,
      highest_price: row.tradePrice,
      change_rate: null,
      is_new_high: false,
      is_significant_drop: false,
      deal_type: row.dealType,
      drop_level: "none",
      property_type: APT_PROPERTY_TYPE,
    };
  });
}

function rentDbRows(rentRows) {
  return rentRows.map((row) => ({
    id: rentTransactionId(row),
    region_code: row.regionCode,
    region_name: row.regionName,
    apt_name: row.aptName,
    size_sqm: String(row.sizeSqm),
    floor: row.floor,
    deposit: row.deposit,
    monthly_rent: row.monthlyRent,
    rent_type: row.rentType,
    contract_type: row.contractType || null,
    trade_date: row.tradeDate,
    pre_deposit: row.preDeposit,
    pre_monthly_rent: row.preMonthlyRent,
    raw_data: row.rawData,
  }));
}

async function fetchRentRowsForReconcile(pool) {
  const result = await pool.query(
    `SELECT id, apt_name, size_sqm, floor, trade_date, deposit, monthly_rent
     FROM apt_rent_transactions`
  );
  return result.rows;
}

async function repairRentLookupIndex(pool) {
  await pool.query("DROP INDEX IF EXISTS apt_rent_transactions@idx_rent_unique");
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_rent_lookup
     ON apt_rent_transactions(apt_name, size_sqm, floor, trade_date, deposit, monthly_rent)`
  );

  return {
    droppedUniqueIndex: "idx_rent_unique",
    ensuredLookupIndex: "idx_rent_lookup",
  };
}

async function reconcileRentsCommand(options) {
  const apply = options.apply === "true";
  const repairIndex = parseBooleanOption(options["repair-index"], true);
  const localRows = readJsonLines(RENT_FILE);
  const pool = await dbPool();
  const summaryPath = runPath("rent-reconcile", "json");

  try {
    const verification = await verifyDatabase(pool);
    if (!verification.ok) {
      throw new Error(`DB schema is not ready: ${verification.missing.join(", ")}`);
    }

    const dbRows = await fetchRentRowsForReconcile(pool);
    const plan = buildRentReconcilePlan(localRows, dbRows);
    const missingRows = plan.missing.map((item) => item.row);
    const summary = {
      mode: apply ? "apply" : "dry-run",
      summaryPath,
      localRows: plan.localRows,
      localUniqueRows: plan.localUniqueRows,
      dbRows: plan.dbRows,
      missingRows: plan.missing.length,
      missingBlockedByCurrentUnique: plan.missingBlockedByCurrentUnique,
      missingNoCurrentUniqueConflict: plan.missingNoCurrentUniqueConflict,
      insertedRentRows: 0,
      indexRepair: null,
      samples: plan.missing.slice(0, 20).map((item) => ({
        id: item.id,
        regionCode: item.row.regionCode,
        dongName: item.row.dongName,
        aptName: item.row.aptName,
        sizeSqm: item.row.sizeSqm,
        floor: item.row.floor,
        tradeDate: item.row.tradeDate,
        deposit: item.row.deposit,
        monthlyRent: item.row.monthlyRent,
        contractType: item.row.contractType,
        blockedByCurrentUnique: item.blockedByCurrentUnique,
      })),
      startedAt: new Date().toISOString(),
    };

    if (apply && repairIndex && plan.missingBlockedByCurrentUnique > 0) {
      summary.indexRepair = await repairRentLookupIndex(pool);
    }

    if (apply && missingRows.length > 0) {
      summary.insertedRentRows = await insertChunk(
        pool,
        "apt_rent_transactions",
        [
          "id",
          "region_code",
          "region_name",
          "apt_name",
          "size_sqm",
          "floor",
          "deposit",
          "monthly_rent",
          "rent_type",
          "contract_type",
          "trade_date",
          "pre_deposit",
          "pre_monthly_rent",
          "raw_data",
        ],
        rentDbRows(missingRows)
      );
    }

    if (summary.insertedRentRows > 0 && options["refresh-cache"] !== "false") {
      summary.cacheRefresh = await refreshPublicCaches(options);
    }

    const finalRows = await fetchRentRowsForReconcile(pool);
    const finalPlan = buildRentReconcilePlan(localRows, finalRows);
    summary.dbRowsAfter = finalPlan.dbRows;
    summary.missingRowsAfter = finalPlan.missing.length;
    summary.finishedAt = new Date().toISOString();
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (apply && summary.missingRowsAfter > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

async function upload(options) {
  const apply = options.apply === "true";
  const saleRows = uniqueById(readJsonLines(SALE_FILE), saleTransactionId);
  const rentRows = uniqueById(readJsonLines(RENT_FILE), rentTransactionId);
  const summary = {
    mode: apply ? "apply" : "dry-run",
    localSaleRows: saleRows.length,
    localRentRows: rentRows.length,
    insertedComplexes: 0,
    insertedSaleRows: 0,
    insertedRentRows: 0,
  };

  const pool = await dbPool();
  try {
    const verification = await verifyDatabase(pool);
    if (!verification.ok) {
      throw new Error(`DB schema is not ready: ${verification.missing.join(", ")}`);
    }

    if (!apply) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    summary.insertedComplexes = await insertChunk(
      pool,
      "apt_complexes",
      [
        "id",
        "region_code",
        "region_name",
        "dong_name",
        "apt_name",
        "built_year",
        "slug",
        "govt_complex_id",
        "property_type",
      ],
      complexRows(saleRows, rentRows)
    );

    summary.insertedSaleRows = await insertChunk(
      pool,
      "apt_transactions",
      [
        "id",
        "complex_id",
        "region_code",
        "region_name",
        "apt_name",
        "size_sqm",
        "floor",
        "trade_price",
        "trade_date",
        "highest_price",
        "change_rate",
        "is_new_high",
        "is_significant_drop",
        "deal_type",
        "drop_level",
        "property_type",
      ],
      saleDbRows(saleRows)
    );

    summary.insertedRentRows = await insertChunk(
      pool,
      "apt_rent_transactions",
      [
        "id",
        "region_code",
        "region_name",
        "apt_name",
        "size_sqm",
        "floor",
        "deposit",
        "monthly_rent",
        "rent_type",
        "contract_type",
        "trade_date",
        "pre_deposit",
        "pre_monthly_rent",
        "raw_data",
      ],
      rentDbRows(rentRows)
    );

    await updateManifest({ lastUpload: { ...summary, uploadedAt: new Date().toISOString() } });

    if (summary.insertedSaleRows > 0 && options.recalculate !== "false") {
      summary.signalRecalculation = await recalculateSignals(
        pool,
        saleRows.map((row) => row.regionCode)
      );
    }

    if (
      (summary.insertedComplexes > 0 || summary.insertedSaleRows > 0 || summary.insertedRentRows > 0)
      && options["refresh-cache"] !== "false"
    ) {
      summary.cacheRefresh = await refreshPublicCaches(options);
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

async function recalculateSignalsCommand(options) {
  const pool = await dbPool();
  try {
    const regionCodes = options.region
      ? String(options.region).split(",").map((code) => code.trim()).filter(Boolean)
      : undefined;
    const summary = await recalculateSignals(pool, regionCodes);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

async function refreshCacheCommand(options) {
  const summary = await refreshPublicCaches(options);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.skipped && !summary.ok) process.exitCode = 1;
}

function status() {
  const saleRows = readJsonLines(SALE_FILE);
  const rentRows = readJsonLines(RENT_FILE);
  const manifestPath = dataFilePath(MANIFEST_FILE);
  let manifest = null;

  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    manifest = null;
  }

  console.log(JSON.stringify({
    dir: localDataDir(),
    saleRows: saleRows.length,
    uniqueSaleRows: uniqueById(saleRows, saleTransactionId).length,
    rentRows: rentRows.length,
    uniqueRentRows: uniqueById(rentRows, rentTransactionId).length,
    manifest,
  }, null, 2));
}

function usage() {
  console.log(`Usage:
  node scripts/local-data-pipeline.mjs status
  node scripts/local-data-pipeline.mjs verify-db
  node scripts/local-data-pipeline.mjs collect --kind=sale|rent|both --months=1 --batch=0
  node scripts/local-data-pipeline.mjs collect --kind=sale --ym=202605 --region=11680
  node scripts/local-data-pipeline.mjs upload
  node scripts/local-data-pipeline.mjs upload --apply=true
  node scripts/local-data-pipeline.mjs recalculate-signals
  node scripts/local-data-pipeline.mjs reconcile-rents --apply=true
  node scripts/local-data-pipeline.mjs geocode-complexes --limit=1000 --batch-size=120
  node scripts/local-data-pipeline.mjs refresh-cache --app-origin=http://127.0.0.1:3020

Local data dir defaults to .donjup-local-data and can be overridden with DONJUP_LOCAL_DATA_DIR.`);
}

async function main() {
  loadEnvFile();
  const { command, options } = parseArgs(process.argv.slice(2));

  switch (command) {
    case "collect":
      await collect(options);
      break;
    case "status":
      status();
      break;
    case "verify-db":
      await verifyDbCommand();
      break;
    case "upload":
      await upload(options);
      break;
    case "recalculate-signals":
      await recalculateSignalsCommand(options);
      break;
    case "reconcile-rents":
      await reconcileRentsCommand(options);
      break;
    case "geocode-complexes":
      await geocodeComplexesCommand(options);
      break;
    case "refresh-cache":
      await refreshCacheCommand(options);
      break;
    case "help":
    case "--help":
    case "-h":
      usage();
      break;
    default:
      usage();
      process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
