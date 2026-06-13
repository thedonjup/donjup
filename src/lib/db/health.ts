import { sql } from "drizzle-orm";
import {
  publicDatabaseError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";

type DatabaseHealthCode = "OK" | "DB_UNAVAILABLE" | "INTERNAL_ERROR";

export interface DatabaseHealthResult {
  status: 200 | 500 | 503;
  body: {
    ok: boolean;
    code: DatabaseHealthCode;
    message: string;
  };
}

export async function databaseHealthResult(
  check: () => Promise<unknown>,
  onError?: (error: unknown) => void,
): Promise<DatabaseHealthResult> {
  try {
    await check();

    return {
      status: 200,
      body: {
        ok: true,
        code: "OK",
        message: "ok",
      },
    };
  } catch (error) {
    onError?.(error);

    const publicError = publicDatabaseError(error);

    return {
      status: publicError.status,
      body: {
        ok: false,
        code: publicError.code,
        message: publicError.message,
      },
    };
  }
}

export function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  return databaseHealthResult(
    async () => {
      const { db } = await import("@/lib/db");
      return db.execute(sql`SELECT 1`);
    },
    (error) => {
      logDatabaseFailure("Database health check failed", error, {
        route: "/api/health/db",
      });
    },
  );
}
