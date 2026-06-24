import { createGzip } from "node:zlib";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { basename, extname, join, resolve } from "node:path";
import dotenv from "dotenv";

const DEFAULT_LOCAL_DATA_DIR = ".donjup-local-data";
const DEFAULT_MAX_AGE_DAYS = 90;
const ROUTINE_RUN_PREFIXES = ["backup-", "db-health-", "maintenance-", "timer-audit-"];
const ROUTINE_EXTENSIONS = new Set([".json", ".log"]);
const COMPRESSIBLE_EXTENSIONS = new Set([".jsonl"]);
const INSERTED_ID_RE = /^inserted-(sale|rent|complex|identity|identity-source|alias)-ids\.jsonl$/;

function parseArgs(argv) {
  const options = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=", 2);
    options.set(key, value);
  }

  return {
    apply: options.get("apply") === "true",
    maxAgeDays: Number(options.get("max-age-days") || DEFAULT_MAX_AGE_DAYS),
    runDir: options.get("run-dir") || null,
  };
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function dataDir() {
  return resolve(process.cwd(), process.env.DONJUP_LOCAL_DATA_DIR || DEFAULT_LOCAL_DATA_DIR);
}

function runsDir() {
  return resolve(dataDir(), "runs");
}

function outputRunDir(requestedRunDir) {
  const dir = requestedRunDir
    ? resolve(process.cwd(), requestedRunDir)
    : resolve(runsDir(), `prune-local-data-${timestamp()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  const entries = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      entries.push(...walkFiles(path));
    } else if (stat.isFile()) {
      entries.push({ path, stat });
    }
  }
  return entries;
}

function topLevelFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((path) => statSync(path).isFile())
    .map((path) => ({ path, stat: statSync(path) }));
}

function ageDays(stat, nowMs) {
  return (nowMs - stat.mtimeMs) / (24 * 60 * 60 * 1000);
}

function isRoutineRunFile(filePath) {
  const name = basename(filePath);
  return ROUTINE_RUN_PREFIXES.some((prefix) => name.startsWith(prefix))
    && ROUTINE_EXTENSIONS.has(extname(name));
}

function isInsertedIdFile(filePath) {
  return INSERTED_ID_RE.test(basename(filePath));
}

function activeDataFileNames() {
  return new Set([
    "sale-transactions.jsonl",
    "rent-transactions.jsonl",
    "manifest.json",
    "extended-period-manifest.json",
  ]);
}

function classifyCandidates(files, maxAgeDays, nowMs) {
  const activeNames = activeDataFileNames();
  const deleteCandidates = [];
  const compressCandidates = [];
  const protectedFiles = [];
  const activeDataFiles = [];

  for (const file of files) {
    const name = basename(file.path);
    const relativePath = file.path.replace(`${dataDir()}/`, "");

    if (activeNames.has(name) && file.path.startsWith(`${dataDir()}/`)) {
      activeDataFiles.push({ path: relativePath, sizeBytes: file.stat.size });
      continue;
    }

    if (isInsertedIdFile(file.path)) {
      protectedFiles.push({ path: relativePath, reason: "inserted-id-rollback" });
      continue;
    }

    if (ageDays(file.stat, nowMs) < maxAgeDays) {
      continue;
    }

    if (isRoutineRunFile(file.path)) {
      deleteCandidates.push({ path: relativePath, sizeBytes: file.stat.size, ageDays: Number(ageDays(file.stat, nowMs).toFixed(1)) });
      continue;
    }

    if (file.path.startsWith(`${runsDir()}/`) && COMPRESSIBLE_EXTENSIONS.has(extname(name)) && !file.path.endsWith(".gz")) {
      compressCandidates.push({ path: relativePath, sizeBytes: file.stat.size, ageDays: Number(ageDays(file.stat, nowMs).toFixed(1)) });
    }
  }

  return { deleteCandidates, compressCandidates, protectedFiles, activeDataFiles };
}

async function gzipFile(filePath) {
  const gzPath = `${filePath}.gz`;
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), createWriteStream(gzPath, { flags: "wx" }));
  unlinkSync(filePath);
  return gzPath;
}

async function main() {
  dotenv.config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
  const options = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(options.maxAgeDays) || options.maxAgeDays < 1) {
    throw new Error("--max-age-days must be a positive number");
  }

  const runDir = outputRunDir(options.runDir);
  const nowMs = Date.now();
  const files = [
    ...topLevelFiles(dataDir()),
    ...walkFiles(runsDir()),
  ];
  const plan = classifyCandidates(files, options.maxAgeDays, nowMs);
  const applied = { deleted: [], compressed: [], failed: [] };

  if (options.apply) {
    for (const candidate of plan.deleteCandidates) {
      const fullPath = resolve(dataDir(), candidate.path);
      try {
        unlinkSync(fullPath);
        applied.deleted.push(candidate);
      } catch (error) {
        applied.failed.push({ path: candidate.path, action: "delete", error: error instanceof Error ? error.message : String(error) });
      }
    }

    for (const candidate of plan.compressCandidates) {
      const fullPath = resolve(dataDir(), candidate.path);
      try {
        const gzPath = await gzipFile(fullPath);
        applied.compressed.push({ ...candidate, gzPath: gzPath.replace(`${dataDir()}/`, "") });
      } catch (error) {
        applied.failed.push({ path: candidate.path, action: "compress", error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const summary = {
    mode: options.apply ? "apply" : "dry-run",
    checkedAt: new Date().toISOString(),
    runDir,
    dataDir: dataDir(),
    maxAgeDays: options.maxAgeDays,
    deleteCandidateCount: plan.deleteCandidates.length,
    deleteCandidateBytes: plan.deleteCandidates.reduce((sum, item) => sum + item.sizeBytes, 0),
    compressCandidateCount: plan.compressCandidates.length,
    compressCandidateBytes: plan.compressCandidates.reduce((sum, item) => sum + item.sizeBytes, 0),
    protectedInsertedIdFiles: plan.protectedFiles.length,
    activeDataFiles: plan.activeDataFiles,
    deleteCandidates: plan.deleteCandidates,
    compressCandidates: plan.compressCandidates,
    protectedFiles: plan.protectedFiles,
    applied,
  };
  const summaryPath = resolve(runDir, "prune-local-data-summary.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    mode: summary.mode,
    maxAgeDays: summary.maxAgeDays,
    deleteCandidateCount: summary.deleteCandidateCount,
    deleteCandidateBytes: summary.deleteCandidateBytes,
    compressCandidateCount: summary.compressCandidateCount,
    compressCandidateBytes: summary.compressCandidateBytes,
    protectedInsertedIdFiles: summary.protectedInsertedIdFiles,
    activeDataFiles: summary.activeDataFiles.length,
    summaryPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
