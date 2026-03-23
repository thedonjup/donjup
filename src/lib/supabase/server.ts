import { createDbClient, type DbClient } from "@/lib/db/client";

export async function createClient(): Promise<DbClient> {
  return createDbClient();
}

export function createServiceClient(): DbClient {
  return createDbClient();
}
