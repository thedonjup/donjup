import { createDbClient, type DbClient } from "@/lib/db/client";

/**
 * Rent/index data client — now uses the same CockroachDB pool
 * (previously pointed to a separate Supabase project)
 */
export function createRentServiceClient(): DbClient {
  return createDbClient();
}
