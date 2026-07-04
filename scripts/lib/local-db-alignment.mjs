import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import readline from "node:readline";
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

export const DEFAULT_LOCAL_DATA_DIR = ".donjup-local-data";
export const SALE_FILE = "sale-transactions.jsonl";
export const RENT_FILE = "rent-transactions.jsonl";
export const ALIGNMENT_STATE_FILE = "alignment-state.json";
export const EXTENDED_MANIFEST_FILE = "extended-period-manifest.json";

export function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function parseArgs(argv) {
  const options = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=", 2);
    options.set(key, value);
  }
  return Object.fromEntries(options.entries());
}

export function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
}

export function dataDir() {
  return resolve(process.cwd(), process.env.DONJUP_LOCAL_DATA_DIR || DEFAULT_LOCAL_DATA_DIR);
}

export function runsDir() {
  return resolve(dataDir(), "runs");
}

export function dataPath(fileName) {
  return resolve(dataDir(), fileName);
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function ensureParent(path) {
  ensureDir(dirname(path));
}

export function outputRunDir(prefix, requestedRunDir = null) {
  const dir = requestedRunDir
    ? resolve(process.cwd(), requestedRunDir)
    : resolve(runsDir(), `${prefix}-${timestamp()}`);
  ensureDir(dir);
  return dir;
}

export function loadLocalEnv() {
  dotenv.config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
}

export function dbPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 5_000,
  });
}

export function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(path, payload) {
  ensureParent(path);
  writeFileSync(path, JSON.stringify(payload, null, 2), "utf8");
}

export function loadExtendedManifest() {
  const manifest = readJson(dataPath(EXTENDED_MANIFEST_FILE), {});
  return {
    version: 1,
    items: {},
    runs: {},
    ...manifest,
    items: manifest.items ?? {},
    runs: manifest.runs ?? {},
  };
}

export function loadAlignmentState() {
  const state = readJson(dataPath(ALIGNMENT_STATE_FILE), {});
  return {
    version: 1,
    updatedAt: null,
    sale: {},
    rent: {},
    runs: {},
    ...state,
    sale: state.sale ?? {},
    rent: state.rent ?? {},
    runs: state.runs ?? {},
  };
}

export function writeAlignmentState(state) {
  writeJson(dataPath(ALIGNMENT_STATE_FILE), {
    version: 1,
    ...state,
    updatedAt: new Date().toISOString(),
  });
}

export function normalizeYearMonth(value) {
  const text = String(value ?? "").replace(/[^0-9]/g, "");
  return /^\d{6}$/.test(text) ? text : null;
}

export function yearMonthFromDate(value) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7).replace("-", "") : null;
}

export function rowYearMonth(row) {
  return normalizeYearMonth(row.dealYearMonth) ?? yearMonthFromDate(row.tradeDate);
}

export function parseCsvSet(value) {
  if (!value) return null;
  const values = String(value).split(",").map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? new Set(values) : null;
}

export function monthsFromOptions(options) {
  const direct = options.ym || options.months;
  if (direct) {
    return new Set(String(direct).split(",").map(normalizeYearMonth).filter(Boolean));
  }

  const from = normalizeYearMonth(options["from-ym"]);
  const to = normalizeYearMonth(options["to-ym"]);
  if (!from && !to) return null;
  if (!from || !to) throw new Error("--from-ym and --to-ym must be used together");

  const months = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(4, 6));
  const toValue = Number(to);
  while (Number(`${year}${String(month).padStart(2, "0")}`) <= toValue) {
    months.push(`${year}${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      year += 1;
      month = 1;
    }
  }
  return new Set(months);
}

export function kindFile(kind) {
  if (kind === "sale") return dataPath(SALE_FILE);
  if (kind === "rent") return dataPath(RENT_FILE);
  throw new Error(`Unsupported kind: ${kind}`);
}

function normalizeNumericKey(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(value ?? "");
}

function normalizeDbDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

export function saleRowId(row) {
  return [
    row.regionCode,
    row.aptName,
    row.sizeSqm,
    row.tradeDate,
    row.tradePrice,
    row.floor,
  ].join("-");
}

export function rentRowId(row) {
  if (typeof row.id === "string" && row.id.startsWith("rent:")) return row.id;
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

export function rowId(kind, row) {
  return kind === "sale" ? saleRowId(row) : rentRowId(row);
}

export function dbRowId(kind, row) {
  if (row.id) return String(row.id);
  if (kind === "sale") {
    return [
      row.region_code,
      row.apt_name,
      normalizeNumericKey(row.size_sqm),
      normalizeDbDate(row.trade_date),
      row.trade_price,
      row.floor,
    ].join("-");
  }
  return String(row.id ?? "");
}

export function minimalLocalRow(kind, row) {
  const base = {
    id: rowId(kind, row),
    kind,
    regionCode: row.regionCode,
    regionName: row.regionName,
    dongName: row.dongName,
    aptName: row.aptName,
    sizeSqm: row.sizeSqm,
    floor: row.floor,
    tradeDate: row.tradeDate,
    dealYearMonth: rowYearMonth(row),
    collectionRunId: row.collectionRunId,
    extendedRunId: row.extendedRunId,
  };
  return kind === "sale"
    ? { ...base, tradePrice: row.tradePrice, aptSeq: row.aptSeq }
    : { ...base, deposit: row.deposit, monthlyRent: row.monthlyRent, rentType: row.rentType };
}

export function minimalDbRow(kind, row) {
  const base = {
    id: dbRowId(kind, row),
    kind,
    regionCode: row.region_code,
    regionName: row.region_name,
    aptName: row.apt_name,
    sizeSqm: row.size_sqm,
    floor: row.floor,
    tradeDate: normalizeDbDate(row.trade_date),
    dealYearMonth: yearMonthFromDate(row.trade_date),
  };
  return kind === "sale"
    ? { ...base, tradePrice: row.trade_price }
    : { ...base, deposit: row.deposit, monthlyRent: row.monthly_rent, rentType: row.rent_type };
}

export async function streamJsonLines(path, onRow) {
  if (!existsSync(path)) return { rows: 0, invalidRows: 0 };
  const input = createReadStream(path, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let rows = 0;
  let invalidRows = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      rows += 1;
      await onRow(JSON.parse(line), rows);
    } catch {
      invalidRows += 1;
    }
  }
  return { rows, invalidRows };
}

export function jsonlWriter(path) {
  ensureParent(path);
  const stream = createWriteStream(path, { encoding: "utf8" });
  return {
    path,
    write(row) {
      stream.write(`${JSON.stringify(row)}\n`);
    },
    end() {
      return new Promise((resolveEnd, rejectEnd) => {
        stream.end((error) => {
          if (error) rejectEnd(error);
          else resolveEnd();
        });
      });
    },
  };
}

export function manifestScope(options, manifest, kind) {
  const runIds = parseCsvSet(options["run-id"]);
  const months = monthsFromOptions(options);
  const regions = parseCsvSet(options.region || options.regions);
  const statuses = parseCsvSet(options.status || options.statuses);
  const keys = new Set();
  const items = [];

  for (const [key, item] of Object.entries(manifest.items ?? {})) {
    if (kind && item.kind !== kind) continue;
    if (runIds && !runIds.has(item.runId)) continue;
    if (months && !months.has(item.dealYearMonth)) continue;
    if (regions && !regions.has(item.regionCode)) continue;
    if (statuses && !statuses.has(item.status)) continue;
    keys.add(key);
    items.push({ key, ...item });
  }
  return { keys, items, runIds, months, regions, statuses };
}

export function localRowScopeKey(kind, row) {
  return `${kind}:${rowYearMonth(row)}:${row.regionCode}`;
}

export function rowMatchesBasicFilters(kind, row, options) {
  const runIds = parseCsvSet(options["run-id"]);
  const months = monthsFromOptions(options);
  const regions = parseCsvSet(options.region || options.regions);
  const rowRunId = row.extendedRunId || row.collectionRunId || "";
  if (runIds && !runIds.has(rowRunId)) return false;
  if (months && !months.has(rowYearMonth(row))) return false;
  if (regions && !regions.has(String(row.regionCode ?? ""))) return false;
  return row.kind === kind || !row.kind;
}

export function tableName(kind) {
  if (kind === "sale") return "apt_transactions";
  if (kind === "rent") return "apt_rent_transactions";
  throw new Error(`Unsupported kind: ${kind}`);
}

export function dbSelectColumns(kind) {
  return kind === "sale"
    ? "id, region_code, region_name, apt_name, size_sqm, floor, trade_price, trade_date"
    : "id, region_code, region_name, apt_name, size_sqm, floor, deposit, monthly_rent, rent_type, trade_date";
}

export function dbFilterClause(kind, filters, startIndex = 1) {
  const where = [];
  const values = [];
  let index = startIndex;
  if (filters.months?.size) {
    where.push(`replace(substring(trade_date, 1, 7), '-', '') = ANY($${index}::text[])`);
    values.push([...filters.months]);
    index += 1;
  }
  if (filters.regions?.size) {
    where.push(`region_code = ANY($${index}::text[])`);
    values.push([...filters.regions]);
    index += 1;
  }
  return {
    clause: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
    nextIndex: index,
  };
}

export async function fetchDbIdSet(pool, kind, filters = {}) {
  const filter = dbFilterClause(kind, filters);
  const result = await pool.query(
    `SELECT id FROM ${tableName(kind)} ${filter.clause}`,
    filter.values,
  );
  return new Set(result.rows.map((row) => String(row.id)));
}

export async function streamDbRows(pool, kind, filters, onRow, pageSize = 5000) {
  let offset = 0;
  let rows = 0;
  while (true) {
    const filter = dbFilterClause(kind, filters);
    const result = await pool.query(
      `SELECT ${dbSelectColumns(kind)}
       FROM ${tableName(kind)}
       ${filter.clause}
       ORDER BY id
       LIMIT $${filter.nextIndex} OFFSET $${filter.nextIndex + 1}`,
      [...filter.values, pageSize, offset],
    );
    if (result.rowCount === 0) break;
    for (const row of result.rows) {
      rows += 1;
      await onRow(row, rows);
    }
    if (result.rowCount < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

export function sha256File(path) {
  if (!existsSync(path)) return null;
  const hash = createHash("sha256");
  const data = readFileSync(path);
  hash.update(data);
  return hash.digest("hex");
}

export function summarizeExtendedManifest(manifest) {
  const summary = {
    updatedAt: manifest.updatedAt ?? null,
    itemCount: 0,
    byStatus: {},
    byKindStatus: {},
    byRun: {},
  };
  for (const item of Object.values(manifest.items ?? {})) {
    const status = item.status || "unknown";
    const kind = item.kind || "unknown";
    const runId = item.runId || "unknown";
    const rows = Number(item.rowCount || 0);
    summary.itemCount += 1;
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
    const kindStatusKey = `${kind}:${status}`;
    summary.byKindStatus[kindStatusKey] ??= { items: 0, rows: 0 };
    summary.byKindStatus[kindStatusKey].items += 1;
    summary.byKindStatus[kindStatusKey].rows += rows;
    summary.byRun[runId] ??= { items: 0, rows: 0, statuses: {}, kinds: {} };
    summary.byRun[runId].items += 1;
    summary.byRun[runId].rows += rows;
    summary.byRun[runId].statuses[status] = (summary.byRun[runId].statuses[status] || 0) + 1;
    summary.byRun[runId].kinds[kind] = (summary.byRun[runId].kinds[kind] || 0) + 1;
  }
  return summary;
}

