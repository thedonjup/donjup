import { createDbClient, type DbClient } from "./client";

export async function createClient(): Promise<DbClient> {
  return createDbClient();
}

export function createServiceClient(): DbClient {
  return createDbClient();
}
