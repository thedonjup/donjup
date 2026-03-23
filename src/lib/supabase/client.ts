/**
 * Browser client stub — DB access is server-side only.
 * Client components should use API routes (/api/...) for data.
 */
export function createClient(): never {
  throw new Error("Database client is server-side only. Use API routes from client components.");
}
