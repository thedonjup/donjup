const DEFAULT_DB_POOL_MAX = 2;
const MIN_DB_POOL_MAX = 1;
const MAX_DB_POOL_MAX = 10;

export function parseDbPoolMax(value: string | undefined): number {
  if (!value) return DEFAULT_DB_POOL_MAX;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_DB_POOL_MAX;

  return Math.min(Math.max(parsed, MIN_DB_POOL_MAX), MAX_DB_POOL_MAX);
}
