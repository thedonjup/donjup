import { DATA_UNAVAILABLE_MESSAGE } from "@/lib/public-api-error";

export interface SearchSuggestion {
  label: string;
  query: string;
  description: string;
}

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  {
    label: "강남 래미안",
    query: "강남 래미안",
    description: "지역과 브랜드를 함께 입력",
  },
  {
    label: "송파 주공",
    query: "송파 주공",
    description: "구 이름과 단지 키워드 조합",
  },
  {
    label: "마포 자이",
    query: "마포 자이",
    description: "관심 지역의 대표 단지 확인",
  },
  {
    label: "분당 파크뷰",
    query: "분당 파크뷰",
    description: "신도시 단지 흐름 확인",
  },
];

export function searchSuggestionHref(query: string, propertyType = 1): string {
  const params = new URLSearchParams({ q: query });
  if (propertyType !== 1) {
    params.set("type", String(propertyType));
  }

  return `/search?${params.toString()}`;
}

export function searchResultLabel({
  query,
  hasFilters,
  resultCount,
}: {
  query: string;
  hasFilters: boolean;
  resultCount: number;
}): string {
  const prefix = query ? `"${query}"` : hasFilters ? "필터" : "전체";
  return `${prefix} 검색 결과 ${resultCount.toLocaleString()}건`;
}

export function searchEmptyTitle({
  query,
  hasFilters,
}: {
  query: string;
  hasFilters: boolean;
}): string {
  if (query) return `"${query}" 검색 결과가 없습니다`;
  if (hasFilters) return "해당 조건의 검색 결과가 없습니다";
  return "아파트명 또는 지역명을 검색하세요";
}

export function searchFailureCopy(isDataUnavailable: boolean): {
  title: string;
  description: string;
} {
  if (isDataUnavailable) {
    return {
      title: "검색 데이터를 준비하는 중입니다",
      description: DATA_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    title: "검색 결과를 불러오지 못했습니다",
    description: "검색어와 필터를 유지한 채 잠시 후 다시 시도해 주세요.",
  };
}
