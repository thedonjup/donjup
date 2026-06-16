import dotenv from "dotenv";
import path from "path";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { Pool, type PoolClient } from "pg";
import {
  makeIdentityCanonicalId,
  makeIdentityId,
  makeNaturalIdentityId,
  normalizeComplexName,
} from "../src/lib/complex-identity";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

type ComplexRow = {
  id: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  apt_name: string;
  built_year: number | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  slug: string;
  govt_complex_id: string | null;
  property_type: number | null;
};

type CliOptions = {
  apply: boolean;
  migrate: boolean;
  runDir: string;
};

type IdentityRecord = {
  id: string;
  canonicalId: string;
  regionCode: string;
  regionName: string;
  dongName: string | null;
  aptName: string;
  normalizedName: string;
  builtYear: number | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
};

type SourceRecord = {
  id: string;
  identityId: string;
  source: "molit_apt_seq" | "natural";
  sourceComplexId: string;
  sourcePayload: string;
  confidence: number;
};

type AliasRecord = {
  id: string;
  identityId: string;
  aliasType: string;
  aliasValue: string;
};

type ComplexIdentityUpdate = {
  id: string;
  identityId: string;
};

type RentOnlyGroup = {
  region_code: string;
  region_name: string;
  dong_name: string | null;
  apt_name: string;
  built_year: number | null;
};

const BACKFILL_BATCH_SIZE = 500;

function parseArgs(argv: string[]): CliOptions {
  const options = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=", 2);
    options.set(key, value);
  }

  const defaultRunDir = path.resolve(
    process.cwd(),
    ".donjup-local-data",
    "runs",
    `complex-identity-backfill-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
  );

  return {
    apply: options.get("apply") === "true",
    migrate: options.get("migrate") !== "false",
    runDir: options.get("run-dir")
      ? path.resolve(process.cwd(), options.get("run-dir") as string)
      : defaultRunDir,
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

async function applyMigration(client: PoolClient): Promise<void> {
  const sql = readFileSync(
    path.resolve(process.cwd(), "scripts/migrations/20260617-complex-identities.sql"),
    "utf8",
  );
  await client.query(sql);
}

function identityForComplex(row: ComplexRow): {
  identityId: string;
  canonicalId: string;
  source: "molit_apt_seq" | "natural";
  sourceComplexId: string;
} {
  const input = {
    regionCode: row.region_code,
    dongName: row.dong_name,
    aptName: row.apt_name,
    builtYear: row.built_year,
    propertyType: row.property_type ?? 1,
    govtComplexId: row.govt_complex_id,
  };
  const identityId = makeIdentityId(input);
  const canonicalId = makeIdentityCanonicalId(input);

  return row.govt_complex_id
    ? {
        identityId,
        canonicalId,
        source: "molit_apt_seq",
        sourceComplexId: row.govt_complex_id,
      }
    : {
        identityId,
        canonicalId,
        source: "natural",
        sourceComplexId: canonicalId,
      };
}

function sourceId(source: string, sourceComplexId: string): string {
  return `source:${source}:${sourceComplexId}`;
}

function aliasId(aliasType: string, aliasValue: string): string {
  return `alias:${aliasType}:${aliasValue}`;
}

function regionNameWithoutDong(regionName: string, dongName: string | null): string {
  if (!dongName) return regionName;
  const suffix = ` ${dongName}`;
  return regionName.endsWith(suffix)
    ? regionName.slice(0, -suffix.length)
    : regionName;
}

async function fetchMissingRentOnlyComplexes(client: PoolClient): Promise<ComplexRow[]> {
  const groups = (await client.query<RentOnlyGroup>(`
    SELECT
      r.region_code,
      min(r.region_name) AS region_name,
      NULLIF(r.raw_data->>'umdNm', '') AS dong_name,
      r.apt_name,
      CASE WHEN r.raw_data->>'buildYear' ~ '^[0-9]{4}$'
        THEN (r.raw_data->>'buildYear')::INT
        ELSE NULL
      END AS built_year
    FROM apt_rent_transactions r
    WHERE NOT EXISTS (
      SELECT 1
      FROM apt_complexes c
      WHERE c.region_code = r.region_code
        AND c.apt_name = r.apt_name
        AND c.property_type = 1
        AND (NULLIF(r.raw_data->>'umdNm', '') IS NULL OR c.dong_name = NULLIF(r.raw_data->>'umdNm', ''))
        AND (
          CASE WHEN r.raw_data->>'buildYear' ~ '^[0-9]{4}$'
            THEN (r.raw_data->>'buildYear')::INT
            ELSE NULL
          END IS NULL
          OR c.built_year = CASE WHEN r.raw_data->>'buildYear' ~ '^[0-9]{4}$'
            THEN (r.raw_data->>'buildYear')::INT
            ELSE NULL
          END
        )
    )
    GROUP BY
      r.region_code,
      NULLIF(r.raw_data->>'umdNm', ''),
      r.apt_name,
      CASE WHEN r.raw_data->>'buildYear' ~ '^[0-9]{4}$'
        THEN (r.raw_data->>'buildYear')::INT
        ELSE NULL
      END
    ORDER BY r.region_code, r.apt_name
  `)).rows;

  return groups.map((group) => {
    const identityId = makeNaturalIdentityId({
      regionCode: group.region_code,
      dongName: group.dong_name,
      aptName: group.apt_name,
      builtYear: group.built_year,
      propertyType: 1,
    });

    return {
      id: identityId,
      region_code: group.region_code,
      region_name: regionNameWithoutDong(group.region_name, group.dong_name),
      dong_name: group.dong_name,
      apt_name: group.apt_name,
      built_year: group.built_year,
      address: null,
      latitude: null,
      longitude: null,
      slug: identityId,
      govt_complex_id: null,
      property_type: 1,
    };
  });
}

async function insertRentOnlyComplexes(
  client: PoolClient,
  complexes: ComplexRow[],
): Promise<number> {
  let inserted = 0;

  for (let index = 0; index < complexes.length; index += BACKFILL_BATCH_SIZE) {
    const chunk = complexes.slice(index, index + BACKFILL_BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const offset = rowIndex * 10;
      values.push(
        row.id,
        row.region_code,
        row.region_name,
        row.dong_name,
        row.apt_name,
        row.built_year,
        row.slug,
        row.govt_complex_id,
        identityForComplex(row).identityId,
        row.property_type,
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
    });
    const result = await client.query(
      `INSERT INTO apt_complexes (
         id, region_code, region_name, dong_name, apt_name, built_year,
         slug, govt_complex_id, identity_id, property_type
       ) VALUES ${placeholders.join(", ")}
       ON CONFLICT (id) DO NOTHING`,
      values,
    );
    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

async function snapshot(client: PoolClient, runDir: string): Promise<void> {
  const counts = await client.query(`
    SELECT
      (SELECT count(*)::INT FROM apt_complexes) AS complexes,
      (SELECT count(*)::INT FROM apt_complexes WHERE govt_complex_id IS NULL) AS complexes_without_govt,
      (SELECT count(*)::INT FROM apt_transactions) AS sale_transactions,
      (SELECT count(*)::INT FROM apt_rent_transactions) AS rent_transactions,
      (SELECT count(*)::INT FROM page_views) AS page_views
  `);
  const doosan = await client.query(`
    SELECT id, slug, govt_complex_id, identity_id, region_code, region_name, dong_name, apt_name, built_year
    FROM apt_complexes
    WHERE region_code = '11230' AND dong_name = '답십리동' AND apt_name LIKE '%두산%'
    ORDER BY apt_name, built_year NULLS LAST
  `);
  writeFileSync(
    path.join(runDir, "db-targeted-snapshot.json"),
    JSON.stringify({ counts: counts.rows[0], doosan: doosan.rows }, null, 2),
  );
}

async function upsertComplexIdentities(client: PoolClient, complexes: ComplexRow[]): Promise<{
  identityCount: number;
  sourceCount: number;
  aliasCount: number;
  updatedComplexes: number;
}> {
  let identityCount = 0;
  let sourceCount = 0;
  let aliasCount = 0;
  let updatedComplexes = 0;
  const identityRows: IdentityRecord[] = [];
  const sourceRows: SourceRecord[] = [];
  const aliasRows: AliasRecord[] = [];
  const updateRows: ComplexIdentityUpdate[] = [];

  for (const row of complexes) {
    const identity = identityForComplex(row);
    identityRows.push({
      id: identity.identityId,
      canonicalId: identity.canonicalId,
      regionCode: row.region_code,
      regionName: row.region_name,
      dongName: row.dong_name,
      aptName: row.apt_name,
      normalizedName: normalizeComplexName(row.apt_name),
      builtYear: row.built_year,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
    });
    sourceRows.push({
      id: sourceId(identity.source, identity.sourceComplexId),
      identityId: identity.identityId,
      source: identity.source,
      sourceComplexId: identity.sourceComplexId,
      sourcePayload: JSON.stringify({ complexId: row.id, slug: row.slug, govtComplexId: row.govt_complex_id }),
      confidence: identity.source === "molit_apt_seq" ? 100 : 90,
    });

    const aliases = [
      ["complex_id", row.id],
      ["slug", row.slug],
      row.govt_complex_id ? ["govt_complex_id", row.govt_complex_id] : null,
    ].filter((value): value is [string, string] => Boolean(value));

    for (const [aliasType, aliasValue] of aliases) {
      aliasRows.push({
        id: aliasId(aliasType, aliasValue),
        identityId: identity.identityId,
        aliasType,
        aliasValue,
      });
    }
    updateRows.push({ id: row.id, identityId: identity.identityId });
  }

  const uniqueIdentityRows = [...new Map(identityRows.map((row) => [row.canonicalId, row])).values()];
  const uniqueSourceRows = [...new Map(sourceRows.map((row) => [`${row.source}:${row.sourceComplexId}`, row])).values()];
  const uniqueAliasRows = [...new Map(aliasRows.map((row) => [`${row.aliasType}:${row.aliasValue}`, row])).values()];
  const uniqueUpdateRows = [...new Map(updateRows.map((row) => [row.id, row])).values()];

  for (let index = 0; index < uniqueIdentityRows.length; index += BACKFILL_BATCH_SIZE) {
    const chunk = uniqueIdentityRows.slice(index, index + BACKFILL_BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const offset = rowIndex * 11;
      values.push(
        row.id,
        row.canonicalId,
        row.regionCode,
        row.regionName,
        row.dongName,
        row.aptName,
        row.normalizedName,
        row.builtYear,
        row.address,
        row.latitude,
        row.longitude,
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}::NUMERIC, $${offset + 11}::NUMERIC, 100, NOW())`;
    });
    const result = await client.query(
      `INSERT INTO apt_complex_identities (
         id, canonical_id, region_code, region_name, dong_name, apt_name, normalized_name,
         built_year, address, latitude, longitude, confidence, updated_at
       ) VALUES ${placeholders.join(", ")}
       ON CONFLICT (canonical_id) DO UPDATE SET
         id = EXCLUDED.id,
         canonical_id = EXCLUDED.canonical_id,
         region_code = EXCLUDED.region_code,
         region_name = EXCLUDED.region_name,
         dong_name = EXCLUDED.dong_name,
         apt_name = EXCLUDED.apt_name,
         normalized_name = EXCLUDED.normalized_name,
         built_year = EXCLUDED.built_year,
         address = EXCLUDED.address,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         updated_at = NOW()`,
      values,
    );
    identityCount += result.rowCount ?? 0;
  }

  for (let index = 0; index < uniqueSourceRows.length; index += BACKFILL_BATCH_SIZE) {
    const chunk = uniqueSourceRows.slice(index, index + BACKFILL_BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const offset = rowIndex * 6;
      values.push(row.id, row.identityId, row.source, row.sourceComplexId, row.sourcePayload, row.confidence);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::JSONB, $${offset + 6}, NOW())`;
    });
    const result = await client.query(
      `INSERT INTO apt_complex_identity_sources (
         id, identity_id, source, source_complex_id, source_payload, confidence, updated_at
       ) VALUES ${placeholders.join(", ")}
       ON CONFLICT (source, source_complex_id) DO UPDATE SET
         identity_id = EXCLUDED.identity_id,
         source_payload = EXCLUDED.source_payload,
         confidence = EXCLUDED.confidence,
         updated_at = NOW()`,
      values,
    );
    sourceCount += result.rowCount ?? 0;
  }

  for (let index = 0; index < uniqueAliasRows.length; index += BACKFILL_BATCH_SIZE) {
    const chunk = uniqueAliasRows.slice(index, index + BACKFILL_BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const offset = rowIndex * 4;
      values.push(row.id, row.identityId, row.aliasType, row.aliasValue);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    });
    const result = await client.query(
      `INSERT INTO apt_complex_aliases (id, identity_id, alias_type, alias_value)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (alias_type, alias_value) DO UPDATE SET identity_id = EXCLUDED.identity_id`,
      values,
    );
    aliasCount += result.rowCount ?? 0;
  }

  for (let index = 0; index < uniqueUpdateRows.length; index += BACKFILL_BATCH_SIZE) {
    const chunk = uniqueUpdateRows.slice(index, index + BACKFILL_BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const offset = rowIndex * 2;
      values.push(row.id, row.identityId);
      return `($${offset + 1}::TEXT, $${offset + 2}::TEXT)`;
    });
    const result = await client.query(
      `UPDATE apt_complexes AS c
       SET identity_id = v.identity_id,
           updated_at = NOW()
       FROM (VALUES ${placeholders.join(", ")}) AS v(id, identity_id)
       WHERE c.id = v.id
         AND c.identity_id IS DISTINCT FROM v.identity_id`,
      values,
    );
    updatedComplexes += result.rowCount ?? 0;
  }

  return { identityCount, sourceCount, aliasCount, updatedComplexes };
}

async function backfillTransactionLinks(client: PoolClient): Promise<{
  saleIdentityRows: number;
  rentLinkedRows: number;
  rentUnlinkedRows: number;
}> {
  const saleUpdate = await client.query(`
    UPDATE apt_transactions AS t
    SET identity_id = c.identity_id
    FROM apt_complexes AS c
    WHERE t.complex_id = c.id
      AND c.identity_id IS NOT NULL
      AND (t.identity_id IS DISTINCT FROM c.identity_id)
  `);

  const rentUniqueUpdate = await client.query(`
    WITH candidates AS (
      SELECT
        r.id AS rent_id,
        c.id AS complex_id,
        c.identity_id,
        row_number() OVER (
          PARTITION BY r.id
          ORDER BY
            CASE WHEN c.dong_name = r.raw_data->>'umdNm' THEN 0 ELSE 1 END,
            CASE WHEN c.built_year::TEXT = NULLIF(r.raw_data->>'buildYear', '') THEN 0 ELSE 1 END,
            c.govt_complex_id NULLS LAST,
            c.id
        ) AS rn,
        count(*) OVER (PARTITION BY r.id) AS candidate_count
      FROM apt_rent_transactions r
      JOIN apt_complexes c
        ON c.region_code = r.region_code
       AND c.apt_name = r.apt_name
       AND c.property_type = 1
      WHERE c.identity_id IS NOT NULL
    )
    UPDATE apt_rent_transactions AS r
    SET complex_id = candidates.complex_id,
        identity_id = candidates.identity_id
    FROM candidates
    WHERE candidates.rent_id = r.id
      AND candidates.rn = 1
      AND candidates.candidate_count = 1
      AND (r.complex_id IS DISTINCT FROM candidates.complex_id
        OR r.identity_id IS DISTINCT FROM candidates.identity_id)
  `);

  const rentStrictUpdate = await client.query(`
    WITH candidates AS (
      SELECT
        r.id AS rent_id,
        c.id AS complex_id,
        c.identity_id,
        row_number() OVER (PARTITION BY r.id ORDER BY c.id) AS rn,
        count(*) OVER (PARTITION BY r.id) AS candidate_count
      FROM apt_rent_transactions r
      JOIN apt_complexes c
        ON c.region_code = r.region_code
       AND c.apt_name = r.apt_name
       AND c.property_type = 1
       AND (r.raw_data->>'umdNm' IS NULL OR r.raw_data->>'umdNm' = '' OR c.dong_name = r.raw_data->>'umdNm')
       AND (r.raw_data->>'buildYear' IS NULL OR r.raw_data->>'buildYear' = '' OR c.built_year::TEXT = r.raw_data->>'buildYear')
      WHERE c.identity_id IS NOT NULL
    )
    UPDATE apt_rent_transactions AS r
    SET complex_id = candidates.complex_id,
        identity_id = candidates.identity_id
    FROM candidates
    WHERE candidates.rent_id = r.id
      AND candidates.rn = 1
      AND candidates.candidate_count = 1
      AND (r.complex_id IS DISTINCT FROM candidates.complex_id
        OR r.identity_id IS DISTINCT FROM candidates.identity_id)
  `);

  const rentUnlinked = await client.query(`
    SELECT count(*)::INT AS count
    FROM apt_rent_transactions
    WHERE identity_id IS NULL OR complex_id IS NULL
  `);

  return {
    saleIdentityRows: saleUpdate.rowCount ?? 0,
    rentLinkedRows: (rentUniqueUpdate.rowCount ?? 0) + (rentStrictUpdate.rowCount ?? 0),
    rentUnlinkedRows: Number(rentUnlinked.rows[0]?.count ?? 0),
  };
}

async function verifyTarget(client: PoolClient): Promise<Record<string, unknown>> {
  const counts = await client.query(`
    SELECT
      (SELECT count(*)::INT FROM apt_complex_identities) AS identities,
      (SELECT count(*)::INT FROM apt_complex_identity_sources) AS sources,
      (SELECT count(*)::INT FROM apt_complex_aliases) AS aliases,
      (SELECT count(*)::INT FROM apt_complexes WHERE identity_id IS NOT NULL) AS complexes_with_identity,
      (SELECT count(*)::INT FROM apt_rent_transactions WHERE identity_id IS NOT NULL) AS rent_with_identity,
      (SELECT count(*)::INT FROM apt_rent_transactions WHERE complex_id IS NOT NULL) AS rent_with_complex,
      (SELECT count(*)::INT FROM apt_transactions WHERE identity_id IS NOT NULL) AS sale_with_identity
  `);
  const doosan = await client.query(`
    SELECT c.id, c.slug, c.govt_complex_id, c.identity_id, c.apt_name, c.dong_name, c.built_year,
           count(r.id)::INT AS rent_count
    FROM apt_complexes c
    LEFT JOIN apt_rent_transactions r ON r.complex_id = c.id
    WHERE c.region_code = '11230' AND c.dong_name = '답십리동' AND c.apt_name LIKE '%두산%'
    GROUP BY c.id, c.slug, c.govt_complex_id, c.identity_id, c.apt_name, c.dong_name, c.built_year
    ORDER BY c.apt_name
  `);
  const doosanSources = await client.query(`
    SELECT s.identity_id, s.source, s.source_complex_id, s.confidence
    FROM apt_complex_identity_sources s
    JOIN apt_complexes c ON c.identity_id = s.identity_id
    WHERE c.region_code = '11230' AND c.dong_name = '답십리동' AND c.apt_name LIKE '%두산%'
    ORDER BY s.identity_id, s.source
  `);
  return {
    counts: counts.rows[0],
    doosan: doosan.rows,
    doosanSources: doosanSources.rows,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(options.runDir, { recursive: true });
  const clientPool = pool();
  const client = await clientPool.connect();
  const startedAt = new Date().toISOString();
  const summary: Record<string, unknown> = {
    mode: options.apply ? "apply" : "dry-run",
    migrated: false,
    runDir: options.runDir,
    startedAt,
  };

  try {
    if (options.migrate && options.apply) {
      await applyMigration(client);
      summary.migrated = true;
    }

    if (options.apply) {
      await snapshot(client, options.runDir);
    }

    let complexes = (await client.query<ComplexRow>(`
      SELECT id, region_code, region_name, dong_name, apt_name, built_year,
             address, latitude::TEXT AS latitude, longitude::TEXT AS longitude,
             slug, govt_complex_id, property_type
      FROM apt_complexes
      ORDER BY id
    `)).rows;
    const missingRentOnlyComplexes = options.apply
      ? await fetchMissingRentOnlyComplexes(client)
      : [];

    if (options.apply && missingRentOnlyComplexes.length > 0) {
      summary.createdRentOnlyComplexes = await insertRentOnlyComplexes(
        client,
        missingRentOnlyComplexes,
      );
      complexes = [...complexes, ...missingRentOnlyComplexes];
    }

    summary.complexRows = complexes.length;
    summary.govtComplexRows = complexes.filter((row) => row.govt_complex_id).length;
    summary.naturalComplexRows = complexes.filter((row) => !row.govt_complex_id).length;

    if (options.apply) {
      const upsertSummary = await upsertComplexIdentities(client, complexes);
      const transactionSummary = await backfillTransactionLinks(client);
      Object.assign(summary, upsertSummary, transactionSummary);
      summary.verification = await verifyTarget(client);
    } else {
      summary.samples = complexes.slice(0, 20).map((row) => ({
        id: row.id,
        slug: row.slug,
        govtComplexId: row.govt_complex_id,
        identityId: identityForComplex(row).identityId,
        canonicalId: identityForComplex(row).canonicalId,
      }));
    }

    summary.finishedAt = new Date().toISOString();
    const summaryPath = path.join(options.runDir, "complex-identity-backfill-summary.json");
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({
      mode: summary.mode,
      migrated: summary.migrated,
      complexRows: summary.complexRows,
      govtComplexRows: summary.govtComplexRows,
      naturalComplexRows: summary.naturalComplexRows,
      verification: summary.verification,
      summaryPath,
    }, null, 2));
  } finally {
    client.release();
    await clientPool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
