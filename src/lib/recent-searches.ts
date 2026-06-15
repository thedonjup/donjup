export interface RecentSearchItem {
  query: string;
  propertyType: number;
  searchedAt: number;
}

export const RECENT_SEARCHES_KEY = "donjup-recent-searches";
export const RECENT_SEARCHES_EVENT = "donjup-recent-searches-change";
export const MAX_RECENT_SEARCHES = 6;
const EMPTY_RECENT_SEARCHES: RecentSearchItem[] = [];

let cachedRawRecentSearches: string | null | undefined;
let cachedRecentSearches: RecentSearchItem[] = EMPTY_RECENT_SEARCHES;

function normalizeRecentQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

function isRecentSearchItem(value: unknown): value is RecentSearchItem {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.query === "string" &&
    typeof record.propertyType === "number" &&
    Number.isInteger(record.propertyType) &&
    typeof record.searchedAt === "number"
  );
}

export function mergeRecentSearches(
  current: RecentSearchItem[],
  query: string,
  propertyType: number,
  now = Date.now(),
): RecentSearchItem[] {
  const normalizedQuery = normalizeRecentQuery(query);
  if (!normalizedQuery) return current.slice(0, MAX_RECENT_SEARCHES);

  const filtered = current.filter((item) =>
    item.query !== normalizedQuery || item.propertyType !== propertyType
  );

  return [
    { query: normalizedQuery, propertyType, searchedAt: now },
    ...filtered,
  ].slice(0, MAX_RECENT_SEARCHES);
}

export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === "undefined") return EMPTY_RECENT_SEARCHES;

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) {
      cachedRawRecentSearches = raw;
      cachedRecentSearches = EMPTY_RECENT_SEARCHES;
      return cachedRecentSearches;
    }

    if (raw === cachedRawRecentSearches) {
      return cachedRecentSearches;
    }

    const parsed: unknown = JSON.parse(raw);
    cachedRawRecentSearches = raw;
    cachedRecentSearches = Array.isArray(parsed)
      ? parsed.filter(isRecentSearchItem).slice(0, MAX_RECENT_SEARCHES)
      : EMPTY_RECENT_SEARCHES;
    return cachedRecentSearches;
  } catch {
    cachedRawRecentSearches = undefined;
    cachedRecentSearches = EMPTY_RECENT_SEARCHES;
    return cachedRecentSearches;
  }
}

export function saveRecentSearch(query: string, propertyType: number): void {
  if (typeof window === "undefined") return;

  try {
    const next = mergeRecentSearches(getRecentSearches(), query, propertyType);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
  } catch {
    // ignore localStorage failures
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
  } catch {
    // ignore localStorage failures
  }
}
