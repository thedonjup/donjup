export const DATA_UNAVAILABLE_MESSAGE =
  "데이터를 준비하는 중입니다. 잠시 후 다시 시도해 주세요.";

const GENERIC_API_ERROR_MESSAGE =
  "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

interface ApiErrorBody {
  code?: unknown;
  error?: unknown;
  message?: unknown;
}

export type FetchJsonOptions = {
  cacheTtlMs?: number;
};

const DEFAULT_GET_CACHE_TTL_MS = 30_000;
const MAX_GET_CACHE_ENTRIES = 100;

type FetchJsonCacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const getCache = new Map<string, FetchJsonCacheEntry>();

function asApiErrorBody(value: unknown): ApiErrorBody | null {
  return typeof value === "object" && value !== null
    ? (value as ApiErrorBody)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function publicApiErrorMessage(
  body: unknown,
  status: number,
  fallback = GENERIC_API_ERROR_MESSAGE
): string {
  const errorBody = asApiErrorBody(body);

  if (errorBody?.code === "DB_UNAVAILABLE") {
    return DATA_UNAVAILABLE_MESSAGE;
  }

  return (
    nonEmptyString(errorBody?.error) ??
    nonEmptyString(errorBody?.message) ??
    (status >= 500 ? GENERIC_API_ERROR_MESSAGE : fallback)
  );
}

export function messageFromUnknownError(
  error: unknown,
  fallback = GENERIC_API_ERROR_MESSAGE
): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function normalizeCacheTtlMs(value: number | undefined): number {
  if (value === undefined) return DEFAULT_GET_CACHE_TTL_MS;
  if (!Number.isFinite(value)) return DEFAULT_GET_CACHE_TTL_MS;

  return Math.max(0, Math.floor(value));
}

function hasOnlyCacheableInit(init: RequestInit): boolean {
  return Object.keys(init).every((key) => key === "method" || key === "cache");
}

function getCacheKey(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  cacheTtlMs: number
): string | null {
  if (typeof window === "undefined") return null;
  if (cacheTtlMs <= 0) return null;
  if (init && !hasOnlyCacheableInit(init)) return null;

  const method = init?.method?.toUpperCase() ?? "GET";
  if (method !== "GET") return null;

  if (
    init?.cache === "no-store" ||
    init?.cache === "reload" ||
    init?.cache === "no-cache"
  ) {
    return null;
  }

  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();

  return null;
}

function pruneExpiredCacheEntries(now: number): void {
  for (const [key, entry] of getCache) {
    if (entry.expiresAt <= now) {
      getCache.delete(key);
    }
  }
}

function rememberCacheEntry<T>(
  key: string,
  promise: Promise<T>,
  cacheTtlMs: number,
  now: number
): Promise<T> {
  pruneExpiredCacheEntries(now);

  if (getCache.size >= MAX_GET_CACHE_ENTRIES) {
    const oldestKey = getCache.keys().next().value;
    if (oldestKey) getCache.delete(oldestKey);
  }

  getCache.set(key, {
    expiresAt: now + cacheTtlMs,
    promise,
  });

  promise.catch(() => {
    if (getCache.get(key)?.promise === promise) {
      getCache.delete(key);
    }
  });

  return promise;
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallback: string | undefined
): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(publicApiErrorMessage(body, response.status, fallback));
  }

  return body as T;
}

export function clearFetchJsonCache(): void {
  getCache.clear();
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback?: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const cacheTtlMs = normalizeCacheTtlMs(options.cacheTtlMs);
  const cacheKey = getCacheKey(input, init, cacheTtlMs);
  const now = Date.now();

  if (!cacheKey) {
    return requestJson(input, init, fallback);
  }

  const cached = getCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.promise as Promise<T>;
  }

  return rememberCacheEntry(
    cacheKey,
    requestJson<T>(input, init, fallback),
    cacheTtlMs,
    now
  );
}
