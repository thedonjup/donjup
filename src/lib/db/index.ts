import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Connection pool (singleton) — mirrors client.ts config exactly
// ssl: { rejectUnauthorized: false } is REQUIRED for Neon/CockroachDB
// ---------------------------------------------------------------------------
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("[db] DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      console.error("[db] Pool error:", err.message);
      // Recreate pool on connection error
      pool = null;
    });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Drizzle instance — single entry point for all DB access
// casing: 'snake_case' ensures returned row keys match existing snake_case
// destructuring patterns in application code (trade_price, not tradePrice)
// ---------------------------------------------------------------------------
export const db = drizzle({ client: getPool(), schema, casing: "snake_case" });
