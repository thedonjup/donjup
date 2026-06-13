import { sql } from "drizzle-orm";
import { safeErrorListItem } from "@/lib/api/safe-error-response";
import { db } from "@/lib/db";

const TXN_LINK_BATCHES = 20;

const INDEX_SQL = [
  "CREATE INDEX IF NOT EXISTS idx_txn_region_apt ON apt_transactions (region_code, apt_name)",
  "CREATE INDEX IF NOT EXISTS idx_txn_complex_id ON apt_transactions (complex_id) WHERE complex_id IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS idx_txn_trade_date ON apt_transactions (trade_date DESC)",
  "CREATE INDEX IF NOT EXISTS idx_txn_region_date ON apt_transactions (region_code, trade_date DESC)",
  "CREATE INDEX IF NOT EXISTS idx_complex_region_slug ON apt_complexes (region_code, slug)",
] as const;

export type MaintenanceMigrationResult = {
  ok: boolean;
  results: string[];
};

async function recordMigrationStep(
  results: string[],
  failureLabel: string,
  operation: () => Promise<string | string[]>
): Promise<boolean> {
  try {
    const messages = await operation();
    results.push(...(Array.isArray(messages) ? messages : [messages]));
    return true;
  } catch (error) {
    results.push(safeErrorListItem(failureLabel, error));
    return false;
  }
}

export async function runMaintenanceMigration(): Promise<MaintenanceMigrationResult> {
  const results: string[] = [];
  let ok = true;

  ok =
    (await recordMigrationStep(results, "FAIL govt_complex_id", async () => {
      await db.execute(
        sql`ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS govt_complex_id TEXT UNIQUE`
      );
      return "OK: govt_complex_id";
    })) && ok;

  ok =
    (await recordMigrationStep(results, "FAIL property_type", async () => {
      await db.execute(
        sql`ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS property_type INTEGER DEFAULT 1`
      );
      return "OK: property_type";
    })) && ok;

  ok =
    (await recordMigrationStep(results, "FAIL sido_name", async () => {
      await db.execute(
        sql`ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS sido_name TEXT`
      );
      return "OK: sido_name";
    })) && ok;

  ok =
    (await recordMigrationStep(results, "FAIL fix govtComplexId", async () => {
      await db.execute(sql`
        UPDATE apt_complexes
        SET govt_complex_id = region_code || '-' || SUBSTRING(govt_complex_id FROM LENGTH(region_code || '-' || region_code || '-') + 1)
        WHERE govt_complex_id LIKE region_code || '-' || region_code || '-%'
      `);
      return "OK: fix doubled govtComplexId";
    })) && ok;

  ok =
    (await recordMigrationStep(results, "FAIL slug migration", async () => {
      await db.execute(sql`
        UPDATE apt_complexes
        SET slug = govt_complex_id
        WHERE govt_complex_id IS NOT NULL
          AND slug != govt_complex_id
      `);
      return "OK: slug = govtComplexId";
    })) && ok;

  ok =
    (await recordMigrationStep(results, "FAIL txn linking", async () => {
      let totalLinked = 0;

      for (let batch = 0; batch < TXN_LINK_BATCHES; batch += 1) {
        const result = await db.execute(sql`
          UPDATE apt_transactions
          SET complex_id = (
            SELECT c.id FROM apt_complexes c
            WHERE c.region_code = apt_transactions.region_code
              AND c.apt_name = apt_transactions.apt_name
            LIMIT 1
          )
          WHERE id IN (
            SELECT t.id FROM apt_transactions t
            JOIN apt_complexes c ON c.region_code = t.region_code AND c.apt_name = t.apt_name
            WHERE t.complex_id IS NULL
            LIMIT 50000
          )
        `);
        const rowCount = Number(result.rowCount ?? 0);
        totalLinked += rowCount;
        if (rowCount === 0) break;
      }

      return `OK: txn linking (${totalLinked} linked)`;
    })) && ok;

  ok =
    (await recordMigrationStep(results, "FAIL rawData backup", async () => {
      await db.execute(
        sql`CREATE TABLE IF NOT EXISTS apt_transactions_rawdata_backup AS SELECT id, raw_data FROM apt_transactions WHERE raw_data IS NOT NULL LIMIT 0`
      );

      const backupCount = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM apt_transactions_rawdata_backup`
      );
      if (Number(backupCount.rows[0]?.cnt) === 0) {
        await db.execute(
          sql`INSERT INTO apt_transactions_rawdata_backup SELECT id, raw_data FROM apt_transactions WHERE raw_data IS NOT NULL`
        );
      }

      return "OK: rawData backup";
    })) && ok;

  ok =
    (await recordMigrationStep(results, "FAIL rawData drop", async () => {
      await db.execute(
        sql`ALTER TABLE apt_transactions DROP COLUMN IF EXISTS raw_data`
      );
      return "OK: rawData column dropped";
    })) && ok;

  for (const indexSql of INDEX_SQL) {
    ok =
      (await recordMigrationStep(results, "FAIL idx", async () => {
        await db.execute(sql.raw(indexSql));
        return `OK: ${indexSql.slice(0, 60)}...`;
      })) && ok;
  }

  ok =
    (await recordMigrationStep(results, "FAIL stats", async () => {
      const total = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM apt_complexes`
      );
      const noGeo = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM apt_complexes WHERE latitude IS NULL`
      );
      const hasGeo = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM apt_complexes WHERE latitude IS NOT NULL`
      );
      const noGovtId = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM apt_complexes WHERE govt_complex_id IS NULL`
      );
      const txnTotal = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM apt_transactions`
      );
      const txnLinked = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM apt_transactions WHERE complex_id IS NOT NULL`
      );
      const txnWithGeo = await db.execute(sql`
        SELECT COUNT(*) as cnt
        FROM apt_transactions t
        INNER JOIN apt_complexes c ON t.complex_id = c.id
        WHERE c.latitude IS NOT NULL
      `);
      const recentTxn = await db.execute(sql`
        SELECT COUNT(DISTINCT t.apt_name) as cnt
        FROM apt_transactions t
        WHERE t.trade_date >= '2025-01-01'
      `);
      const recentWithGeo = await db.execute(sql`
        SELECT COUNT(DISTINCT t.apt_name) as cnt
        FROM apt_transactions t
        JOIN apt_complexes c ON t.complex_id = c.id
        WHERE t.trade_date >= '2025-01-01'
          AND c.latitude IS NOT NULL
      `);

      return [
        `STATS: complexes=${total.rows[0]?.cnt}, geocoded=${hasGeo.rows[0]?.cnt}, no_geo=${noGeo.rows[0]?.cnt}, no_govt_id=${noGovtId.rows[0]?.cnt}`,
        `TXN_STATS: total=${txnTotal.rows[0]?.cnt}, linked=${txnLinked.rows[0]?.cnt}, with_geo=${txnWithGeo.rows[0]?.cnt}`,
        `RECENT: unique_apts_2025=${recentTxn.rows[0]?.cnt}, with_geo=${recentWithGeo.rows[0]?.cnt}`,
      ];
    })) && ok;

  return { ok, results };
}
