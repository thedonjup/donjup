import dotenv from "dotenv";
import path from "path";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { Pool, type QueryResultRow } from "pg";
import { normalizeComplexName } from "../src/lib/complex-identity";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

const REFERENCE_DIR = path.resolve(process.cwd(), ".donjup-local-data/reference/complex-codes");
const RUNS_DIR = path.resolve(process.cwd(), ".donjup-local-data/runs");

type CliOptions = {
  apply: boolean;
  source: string;
  limit: number;
};

type ReferenceRow = {
  file: string;
  rowNumber: number;
  sourceComplexId: string | null;
  regionCode: string | null;
  dongName: string | null;
  aptName: string | null;
  builtYear: number | null;
  address: string | null;
  raw: Record<string, string>;
};

type ComplexCandidate = QueryResultRow & {
  id: string;
  identity_id: string | null;
  region_code: string;
  dong_name: string | null;
  apt_name: string;
  built_year: number | null;
};

function parseArgs(argv: string[]): CliOptions {
  const options = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=", 2);
    options.set(key, value);
  }

  return {
    apply: options.get("apply") === "true",
    source: options.get("source") || "kab_complex_code",
    limit: Number(options.get("limit") || "0"),
  };
}

function pool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseDelimited(content: string, file: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function firstValue(row: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value) return value;
  }
  return null;
}

function parseReferenceRows(): ReferenceRow[] {
  if (!existsSync(REFERENCE_DIR)) {
    mkdirSync(REFERENCE_DIR, { recursive: true });
    return [];
  }

  const files = readdirSync(REFERENCE_DIR)
    .filter((file) => /\.(csv|tsv|txt|json|jsonl)$/i.test(file))
    .sort();
  const rows: ReferenceRow[] = [];

  for (const file of files) {
    const fullPath = path.join(REFERENCE_DIR, file);
    const content = readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "");
    const rawRows = file.endsWith(".jsonl")
      ? content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
      : file.endsWith(".json")
        ? JSON.parse(content)
        : parseDelimited(content, file);

    if (!Array.isArray(rawRows)) continue;

    rawRows.forEach((raw, index) => {
      const normalizedRaw = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [key.trim(), String(value ?? "").trim()]),
      );
      const regionRaw = firstValue(normalizedRaw, [
        "법정동코드",
        "bjdCode",
        "region_code",
        "regionCode",
        "sigunguCode",
        "시군구코드",
      ]);
      const builtYearRaw = firstValue(normalizedRaw, ["건축년도", "준공년도", "built_year", "buildYear"]);
      const builtYear = builtYearRaw && /^\d{4}$/.test(builtYearRaw)
        ? Number(builtYearRaw)
        : null;

      rows.push({
        file,
        rowNumber: index + 2,
        sourceComplexId: firstValue(normalizedRaw, [
          "단지코드",
          "KAB단지코드",
          "kaptCode",
          "kapt_code",
          "complexCode",
          "complex_id",
        ]),
        regionCode: regionRaw ? regionRaw.slice(0, 5) : null,
        dongName: firstValue(normalizedRaw, ["법정동명", "dong_name", "dongName", "읍면동", "동명"]),
        aptName: firstValue(normalizedRaw, ["단지명", "아파트명", "apt_name", "aptName", "kaptName"]),
        builtYear,
        address: firstValue(normalizedRaw, ["주소", "address", "도로명주소", "지번주소"]),
        raw: normalizedRaw,
      });
    });
  }

  return rows;
}

function confidenceFor(row: ReferenceRow, candidate: ComplexCandidate): number {
  if (!row.aptName || !row.regionCode) return 0;
  if (normalizeComplexName(row.aptName) !== normalizeComplexName(candidate.apt_name)) return 0;
  if (row.regionCode !== candidate.region_code) return 0;

  let confidence = 75;
  if (row.dongName && row.dongName === candidate.dong_name) confidence += 15;
  if (row.builtYear && row.builtYear === candidate.built_year) confidence += 10;
  return Math.min(confidence, 100);
}

function reviewPath(): string {
  mkdirSync(RUNS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return path.join(RUNS_DIR, `complex-code-reference-review-${stamp}.json`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const referenceRows = parseReferenceRows();
  const limitedRows = options.limit > 0 ? referenceRows.slice(0, options.limit) : referenceRows;
  const db = pool();
  const review = {
    mode: options.apply ? "apply" : "dry-run",
    source: options.source,
    referenceDir: REFERENCE_DIR,
    filesRead: existsSync(REFERENCE_DIR) ? readdirSync(REFERENCE_DIR).sort() : [],
    rowsRead: referenceRows.length,
    rowsReviewed: limitedRows.length,
    autoMatches: [] as Record<string, unknown>[],
    conflicts: [] as Record<string, unknown>[],
    skipped: [] as Record<string, unknown>[],
    insertedSources: 0,
  };

  try {
    for (const row of limitedRows) {
      if (!row.sourceComplexId || !row.regionCode || !row.aptName) {
        review.skipped.push({ reason: "missing-required-fields", row });
        continue;
      }

      const candidates = (await db.query<ComplexCandidate>(
        `SELECT id, identity_id, region_code, dong_name, apt_name, built_year
         FROM apt_complexes
         WHERE region_code = $1 AND apt_name = $2
         LIMIT 20`,
        [row.regionCode, row.aptName],
      )).rows
        .map((candidate) => ({
          candidate,
          confidence: confidenceFor(row, candidate),
        }))
        .filter((item) => item.confidence >= 85 && item.candidate.identity_id);

      if (candidates.length !== 1) {
        review[candidates.length > 1 ? "conflicts" : "skipped"].push({
          reason: candidates.length > 1 ? "multiple-candidates" : "no-confident-match",
          row,
          candidates,
        });
        continue;
      }

      const match = candidates[0];
      review.autoMatches.push({ row, candidate: match.candidate, confidence: match.confidence });

      if (options.apply) {
        const result = await db.query(
          `INSERT INTO apt_complex_identity_sources (
             id, identity_id, source, source_complex_id, source_payload, confidence, updated_at
           ) VALUES ($1, $2, $3, $4, $5::JSONB, $6, NOW())
           ON CONFLICT (source, source_complex_id) DO UPDATE SET
             identity_id = EXCLUDED.identity_id,
             source_payload = EXCLUDED.source_payload,
             confidence = EXCLUDED.confidence,
             updated_at = NOW()
           RETURNING 1`,
          [
            `source:${options.source}:${row.sourceComplexId}`,
            match.candidate.identity_id,
            options.source,
            row.sourceComplexId,
            JSON.stringify({ file: row.file, rowNumber: row.rowNumber, raw: row.raw }),
            match.confidence,
          ],
        );
        review.insertedSources += result.rowCount ?? 0;
      }
    }

    const outputPath = reviewPath();
    writeFileSync(outputPath, JSON.stringify(review, null, 2));
    console.log(JSON.stringify({
      mode: review.mode,
      rowsRead: review.rowsRead,
      rowsReviewed: review.rowsReviewed,
      autoMatches: review.autoMatches.length,
      conflicts: review.conflicts.length,
      skipped: review.skipped.length,
      insertedSources: review.insertedSources,
      reviewPath: outputPath,
    }, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
