const MAX_COMPARE_IDS = 3;
const MAX_COMPARE_ID_LENGTH = 80;
const SAFE_COMPARE_ID_RE = /^[0-9A-Za-z가-힣._-]+$/;
const MAX_COMPARE_SEARCH_LENGTH = 60;

export interface CompareInsightItem {
  latestTrade: { trade_price: number } | null;
}

export function parseCompareIds(value: string | null | undefined): string[] {
  if (!value) return [];

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const part of value.split(",")) {
    const id = part.trim();
    if (
      id.length === 0 ||
      id.length > MAX_COMPARE_ID_LENGTH ||
      !SAFE_COMPARE_ID_RE.test(id) ||
      seen.has(id)
    ) {
      continue;
    }

    seen.add(id);
    ids.push(id);

    if (ids.length >= MAX_COMPARE_IDS) break;
  }

  return ids;
}

export function normalizeCompareSearchQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_COMPARE_SEARCH_LENGTH);
}

export function shouldSearchCompareQuery(value: string): boolean {
  return normalizeCompareSearchQuery(value).length >= 2;
}

export function compareSelectionStatus(count: number, max = MAX_COMPARE_IDS): string {
  return `${Math.min(Math.max(count, 0), max)}/${max}개 선택`;
}

export function compareEmptyTitle(count: number): string {
  if (count <= 0) return "비교할 단지를 검색하여 추가하세요";
  if (count === 1) return "비교할 단지를 1개 더 추가하세요";
  return "비교표를 확인하세요";
}

export function latestTradePriceRange(items: CompareInsightItem[]): {
  min: number;
  max: number;
  spread: number;
} | null {
  const prices = items
    .map((item) => item.latestTrade?.trade_price)
    .filter((price): price is number => Number.isFinite(price));

  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return { min, max, spread: max - min };
}

export function validLatestTradeCount(items: CompareInsightItem[]): number {
  return items.filter((item) => Number.isFinite(item.latestTrade?.trade_price)).length;
}

export function buildCompareIdsParam(ids: string[]): string {
  return parseCompareIds(ids.join(",")).join(",");
}

export function buildCompareHref(ids: string[]): string {
  const idsParam = buildCompareIdsParam(ids);
  return idsParam ? `/compare?ids=${encodeURIComponent(idsParam)}` : "/compare";
}
