import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { logger } from "@/lib/logger";
import * as schema from "./schema";
import { parseDbPoolMax } from "./pool-config";

type Database = ReturnType<typeof createDatabase>;

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
      max: parseDbPoolMax(process.env.DB_POOL_MAX),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      logger.error("Database pool error", {
        error: err,
      });
      // Recreate pool on connection error
      pool = null;
    });
  }
  return pool;
}

function createDatabase() {
  return drizzle({ client: getPool(), schema, casing: "snake_case" });
}

let database: Database | null = null;

function getDatabase(): Database {
  database ??= createDatabase();
  return database;
}

// ---------------------------------------------------------------------------
// Drizzle instance — single entry point for all DB access
// casing: 'snake_case' ensures returned row keys match existing snake_case
// destructuring patterns in application code (trade_price, not tradePrice)
// ---------------------------------------------------------------------------
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const value = Reflect.get(getDatabase(), property, receiver);
    return typeof value === "function" ? value.bind(getDatabase()) : value;
  },
});
