const MAX_QUERY_LENGTH = 80;
const MAX_PRICE_MANWON = 10_000_000;
const MAX_SIZE_SQM = 1_000;
const MIN_BUILT_YEAR = 1960;
const MAX_BUILT_YEAR = 2030;
const VALID_PROPERTY_TYPES = new Set([0, 1, 2, 3]);
export const SEARCH_LIKE_ESCAPE = "\\";

export type SearchParamValue = string | string[] | null | undefined;
export type SearchParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

export type SearchFilters = {
  priceMin: number | null;
  priceMax: number | null;
  sizeMin: number | null;
  sizeMax: number | null;
  builtYearMin: number | null;
};

interface OrderedRange {
  min: number | null;
  max: number | null;
}

function firstValue(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function getParam(source: SearchParamSource, key: string): string {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? "";
  }
  return firstValue(source[key]);
}

function parseBoundedNumber(
  value: SearchParamValue,
  { integer, min, max }: { integer: boolean; min: number; max: number },
): number | null {
  const raw = firstValue(value).trim();
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  if (integer && !Number.isInteger(parsed)) return null;
  if (parsed < min || parsed > max) return null;

  return parsed;
}

export function normalizeSearchQuery(value: SearchParamValue): string {
  return firstValue(value).replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

export function toSearchLikePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, `${SEARCH_LIKE_ESCAPE}$&`)}%`;
}

export function parsePropertyType(value: SearchParamValue): number {
  const parsed = Number(firstValue(value));
  return Number.isInteger(parsed) && VALID_PROPERTY_TYPES.has(parsed) ? parsed : 1;
}

function orderRange(min: number | null, max: number | null): OrderedRange {
  if (min !== null && max !== null && min > max) {
    return { min: max, max: min };
  }

  return { min, max };
}

export function parseSearchFilters(source: SearchParamSource): SearchFilters {
  const priceRange = orderRange(
    parseBoundedNumber(getParam(source, "priceMin"), {
      integer: true,
      min: 0,
      max: MAX_PRICE_MANWON,
    }),
    parseBoundedNumber(getParam(source, "priceMax"), {
      integer: true,
      min: 0,
      max: MAX_PRICE_MANWON,
    }),
  );
  const sizeRange = orderRange(
    parseBoundedNumber(getParam(source, "sizeMin"), {
      integer: false,
      min: 0,
      max: MAX_SIZE_SQM,
    }),
    parseBoundedNumber(getParam(source, "sizeMax"), {
      integer: false,
      min: 0,
      max: MAX_SIZE_SQM,
    }),
  );

  return {
    priceMin: priceRange.min,
    priceMax: priceRange.max,
    sizeMin: sizeRange.min,
    sizeMax: sizeRange.max,
    builtYearMin: parseBoundedNumber(getParam(source, "builtYearMin"), {
      integer: true,
      min: MIN_BUILT_YEAR,
      max: MAX_BUILT_YEAR,
    }),
  };
}

export function hasSearchFilters(filters: SearchFilters): boolean {
  return Object.values(filters).some((value) => value !== null);
}

export function filterInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}
