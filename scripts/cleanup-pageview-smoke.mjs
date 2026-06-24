import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

const DEFAULT_PREFIX = "/codex-pageview-smoke-";
const DEFAULT_LOCAL_DATA_DIR = ".donjup-local-data";

function parseArgs(argv) {
  const options = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=", 2);
    options.set(key, value);
  }

  return {
    apply: options.get("apply") === "true",
    prefix: options.get("prefix") || DEFAULT_PREFIX,
    runDir: options.get("run-dir") || null,
  };
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function runsDir() {
  return resolve(process.cwd(), process.env.DONJUP_LOCAL_DATA_DIR || DEFAULT_LOCAL_DATA_DIR, "runs");
}

function outputRunDir(requestedRunDir) {
  const dir = requestedRunDir
    ? resolve(process.cwd(), requestedRunDir)
    : resolve(runsDir(), `pageview-smoke-cleanup-${timestamp()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function validatePrefix(prefix) {
  if (prefix !== DEFAULT_PREFIX) {
    throw new Error(`Refusing broad pageview cleanup prefix: ${prefix}`);
  }
}

function pool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
  });
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
  const options = parseArgs(process.argv.slice(2));
  validatePrefix(options.prefix);

  const runDir = outputRunDir(options.runDir);
  const db = pool();
  const likePattern = `${options.prefix}%`;

  try {
    const before = await db.query("SELECT count(*)::INT AS rows FROM page_views");
    const targets = await db.query(
      `SELECT id::TEXT, page_path, page_type, region_code, complex_id, view_date, view_count::TEXT, created_at
       FROM page_views
       WHERE page_path LIKE $1
       ORDER BY id`,
      [likePattern],
    );

    const exportPath = resolve(runDir, "pageview-smoke-export.json");
    writeFileSync(exportPath, JSON.stringify(targets.rows, null, 2));

    let deletedRows = [];
    if (options.apply && targets.rowCount > 0) {
      const deleted = await db.query(
        `DELETE FROM page_views
         WHERE page_path LIKE $1
         RETURNING id::TEXT, page_path, view_count::TEXT`,
        [likePattern],
      );
      deletedRows = deleted.rows;
    }

    const after = await db.query("SELECT count(*)::INT AS rows FROM page_views");
    const remaining = await db.query(
      `SELECT count(*)::INT AS rows, COALESCE(sum(view_count), 0)::TEXT AS views
       FROM page_views
       WHERE page_path LIKE $1`,
      [likePattern],
    );

    const summary = {
      mode: options.apply ? "apply" : "dry-run",
      prefix: options.prefix,
      checkedAt: new Date().toISOString(),
      runDir,
      exportPath,
      totalRowsBefore: Number(before.rows[0].rows),
      targetRows: targets.rowCount,
      targetViewCount: targets.rows.reduce((sum, row) => sum + Number(row.view_count || 0), 0),
      deletedRows: deletedRows.length,
      totalRowsAfter: Number(after.rows[0].rows),
      remainingSmokeRows: Number(remaining.rows[0].rows),
      remainingSmokeViews: Number(remaining.rows[0].views),
    };
    const summaryPath = resolve(runDir, "pageview-smoke-cleanup-summary.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ ...summary, exportedRows: undefined }, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
