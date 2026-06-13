import type { SearchParamValue } from "@/lib/search-filters";

export const SEARCH_SORT_OPTIONS = [
  {
    value: "relevance",
    label: "관련도순",
    description: "검색어와 단지명 매칭을 우선합니다.",
  },
  {
    value: "recent",
    label: "최신 거래순",
    description: "최근 거래가 있는 단지를 먼저 봅니다.",
  },
  {
    value: "biggest-drop",
    label: "하락률순",
    description: "최근 등락률이 낮은 단지를 우선합니다.",
  },
  {
    value: "highest-price",
    label: "고가순",
    description: "최근 실거래가가 높은 단지를 우선합니다.",
  },
] as const;

export type SearchSortKey = (typeof SEARCH_SORT_OPTIONS)[number]["value"];

const SEARCH_SORT_KEYS = new Set<SearchSortKey>(
  SEARCH_SORT_OPTIONS.map((option) => option.value),
);

function firstValue(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export function parseSearchSort(value: SearchParamValue): SearchSortKey {
  const key = firstValue(value) as SearchSortKey;
  return SEARCH_SORT_KEYS.has(key) ? key : "relevance";
}
