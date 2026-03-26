import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();

  try {
    const txFields = `id, region_code, region_name, apt_name, size_sqm, floor,
      trade_price, trade_date, highest_price, change_rate, is_new_high,
      is_significant_drop, deal_type, drop_level, property_type`;

    // Run all heavy queries in parallel
    const [dropsRes, highsRes, volumeRes, recentRes, ratesRes, txnCountRes, complexCountRes] =
      await Promise.all([
        // Top drops (biggest negative change_rate)
        pool.query(
          `SELECT ${txFields} FROM "apt_transactions"
           WHERE "change_rate" IS NOT NULL AND "change_rate" < 0
           ORDER BY "change_rate" ASC LIMIT 30`
        ),
        // New highs
        pool.query(
          `SELECT ${txFields} FROM "apt_transactions"
           WHERE "is_new_high" = TRUE
           ORDER BY "trade_date" DESC LIMIT 30`
        ),
        // Volume (recent + high price)
        pool.query(
          `SELECT ${txFields} FROM "apt_transactions"
           ORDER BY "trade_date" DESC, "trade_price" DESC LIMIT 30`
        ),
        // Most recent
        pool.query(
          `SELECT ${txFields} FROM "apt_transactions"
           ORDER BY "trade_date" DESC LIMIT 30`
        ),
        // Finance rates
        pool.query(
          `SELECT "rate_type", "rate_value", "prev_value", "change_bp", "base_date", "source"
           FROM "finance_rates"
           ORDER BY "base_date" DESC LIMIT 5`
        ),
        // Total transaction count
        pool.query(`SELECT COUNT(*) as count FROM "apt_transactions"`),
        // Total complex count
        pool.query(`SELECT COUNT(*) as count FROM "apt_complexes"`),
      ]);

    const cacheData = {
      drops: JSON.stringify(dropsRes.rows),
      highs: JSON.stringify(highsRes.rows),
      volume: JSON.stringify(volumeRes.rows),
      recent: JSON.stringify(recentRes.rows),
      rates: JSON.stringify(ratesRes.rows),
      total_transactions: parseInt(txnCountRes.rows[0]?.count ?? "0", 10),
      total_complexes: parseInt(complexCountRes.rows[0]?.count ?? "0", 10),
    };

    // Upsert into homepage_cache (id=1)
    await pool.query(
      `INSERT INTO "homepage_cache" (id, drops, highs, volume, recent, rates, total_transactions, total_complexes, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         drops = EXCLUDED.drops,
         highs = EXCLUDED.highs,
         volume = EXCLUDED.volume,
         recent = EXCLUDED.recent,
         rates = EXCLUDED.rates,
         total_transactions = EXCLUDED.total_transactions,
         total_complexes = EXCLUDED.total_complexes,
         updated_at = NOW()`,
      [
        cacheData.drops,
        cacheData.highs,
        cacheData.volume,
        cacheData.recent,
        cacheData.rates,
        cacheData.total_transactions,
        cacheData.total_complexes,
      ]
    );

    return NextResponse.json({
      ok: true,
      total_transactions: cacheData.total_transactions,
      total_complexes: cacheData.total_complexes,
      drops: dropsRes.rows.length,
      highs: highsRes.rows.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Refresh-cache failed", { error, cron: "refresh-cache" });
    await sendSlackAlert(`[refresh-cache] 실패: ${msg}`);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
