export type PublicApiCacheOptions = {
  browserMaxAge?: number;
  sharedMaxAge?: number;
  staleWhileRevalidate?: number;
};

const DEFAULT_BROWSER_MAX_AGE_SECONDS = 0;
const DEFAULT_SHARED_MAX_AGE_SECONDS = 120;
const DEFAULT_STALE_WHILE_REVALIDATE_SECONDS = 600;

function normalizeSeconds(value: number | undefined, fallback: number): number {
  const seconds = value ?? fallback;

  if (!Number.isFinite(seconds)) {
    return fallback;
  }

  return Math.max(0, Math.floor(seconds));
}

export function publicApiCacheHeader(options: PublicApiCacheOptions = {}): string {
  const browserMaxAge = normalizeSeconds(
    options.browserMaxAge,
    DEFAULT_BROWSER_MAX_AGE_SECONDS
  );
  const sharedMaxAge = normalizeSeconds(
    options.sharedMaxAge,
    DEFAULT_SHARED_MAX_AGE_SECONDS
  );
  const staleWhileRevalidate = normalizeSeconds(
    options.staleWhileRevalidate,
    DEFAULT_STALE_WHILE_REVALIDATE_SECONDS
  );

  return [
    "public",
    `max-age=${browserMaxAge}`,
    `s-maxage=${sharedMaxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
  ].join(", ");
}

export function publicApiCacheHeaders(
  options?: PublicApiCacheOptions
): HeadersInit {
  return {
    "Cache-Control": publicApiCacheHeader(options),
  };
}
