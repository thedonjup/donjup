import type { Metadata } from "next";
import { aptUrl } from "@/lib/apt-url";
import { formatPrice, formatRegion } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";
import SearchTracker from "@/components/analytics/SearchTracker";
import TrackedLink from "@/components/analytics/TrackedLink";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import HighlightedText from "@/components/search/HighlightedText";
import { buildCompareHref } from "@/lib/compare-selection";
import {
  InvestmentSignalPresets,
  PricePresets,
  SizePresets,
  YearPresets,
} from "@/components/search/FilterPresets";
import RecentSearches from "@/components/search/RecentSearches";
import {
  SEARCH_SUGGESTIONS,
  searchEmptyTitle,
  searchFailureCopy,
  searchResultLabel,
  searchSuggestionHref,
} from "@/lib/search-landing";
import {
  isDatabaseResourceLimitError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  filterInputValue,
  hasSearchFilters,
  investmentSignalLabel,
  normalizeSearchQuery,
  parsePropertyType,
  parseSearchFilters,
} from "@/lib/search-filters";
import { getCachedSearchResults } from "@/lib/search-query";
import type { SearchResult } from "@/lib/search-query-data";
import {
  parseSearchSort,
  SEARCH_SORT_OPTIONS,
  type SearchSortKey,
} from "@/lib/search-sort";

function searchResultActivityLabel(apt: SearchResult): string {
  if (apt.latest_trade_price) return "최근 매매";
  if (apt.latest_rent_deposit !== null) return `최근 ${apt.latest_rent_type ?? "전월세"}`;
  return "최근 실거래";
}

function searchResultActivityDate(apt: SearchResult): string | null {
  return apt.latest_trade_price ? apt.latest_trade_date : apt.latest_rent_date;
}

function searchResultRentPrice(apt: SearchResult): string | null {
  if (apt.latest_rent_deposit === null) return null;

  if ((apt.latest_rent_monthly_rent ?? 0) > 0) {
    return `보증금 ${formatPrice(apt.latest_rent_deposit)} / 월 ${formatPrice(apt.latest_rent_monthly_rent ?? 0)}`;
  }

  return `전세 ${formatPrice(apt.latest_rent_deposit)}`;
}

type SearchPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = normalizeSearchQuery(q);

  if (query) {
    return {
      title: `"${query}" 아파트 검색 결과`,
      description: `"${query}" 관련 전국 아파트 실거래가, 시세 변동, 매매 이력을 확인하세요. 돈줍에서 아파트 시세를 한눈에 비교.`,
      alternates: { canonical: `/search?q=${encodeURIComponent(query)}` },
      keywords: [
        `${query} 아파트`,
        `${query} 실거래가`,
        `${query} 시세`,
        "아파트 검색",
        "아파트 실거래가",
        "아파트 시세 조회",
      ],
      openGraph: {
        title: `"${query}" 아파트 검색 결과`,
        description: `"${query}" 관련 실거래가와 단지 정보를 돈줍에서 확인하세요.`,
        url: `/search?q=${encodeURIComponent(query)}`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `"${query}" 아파트 검색 결과`,
        description: "검색한 단지의 최근 실거래가와 기본 정보를 확인하세요.",
      },
    };
  }

  return {
    title: "아파트 검색",
    description:
      "전국 아파트를 검색하고 실거래가, 시세 변동, 매매 이력을 확인하세요. 아파트명으로 간편 검색.",
    keywords: [
      "아파트 검색",
      "아파트 실거래가 검색",
      "아파트 시세 조회",
      "전국 아파트",
      "부동산 검색",
    ],
    alternates: { canonical: "/search" },
    openGraph: {
      title: "아파트 검색",
      description: "전국 아파트 단지명과 지역명을 검색하고 최근 실거래가를 확인하세요.",
      url: "/search",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "아파트 검색",
      description: "지역과 아파트명으로 실거래가를 빠르게 찾아보세요.",
    },
  };
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const params = await searchParams;
  const { q, type: typeParam, sort: sortParam } = params;
  const query = normalizeSearchQuery(q);
  const validType = parsePropertyType(typeParam);
  const filters = parseSearchFilters(params);
  const sort = parseSearchSort(sortParam);

  const filterPriceMin = filterInputValue(filters.priceMin);
  const filterPriceMax = filterInputValue(filters.priceMax);
  const filterSizeMin = filterInputValue(filters.sizeMin);
  const filterSizeMax = filterInputValue(filters.sizeMax);
  const filterBuiltYearMin = filterInputValue(filters.builtYearMin);
  const filterInvestmentSignal = filters.investmentSignal;

  const hasFilters = hasSearchFilters(filters);
  const hasSearch = query.length > 0 || hasFilters;

  let results: SearchResult[] = [];
  let searchFailure: ReturnType<typeof searchFailureCopy> | null = null;

  if (hasSearch) {
    try {
      results = await getCachedSearchResults({
        query,
        propertyType: validType,
        filters,
        sort,
      });
    } catch (error) {
      searchFailure = searchFailureCopy(isDatabaseResourceLimitError(error));
      logDatabaseFailure("Search page query failed", error, {
        route: "/search",
        query,
        hasFilters,
        sort,
      });
    }
  }

  const resultLabel = searchResultLabel({
    query,
    hasFilters,
    resultCount: results.length,
  });
  const emptyTitle = searchEmptyTitle({ query, hasFilters });
  const searchModeLabel = query
    ? "검색어 기준"
    : hasFilters
      ? "필터 기준"
      : "검색 전";
  const retryParams = new URLSearchParams();
  if (query) retryParams.set("q", query);
  if (validType !== 1) retryParams.set("type", String(validType));
  if (sort !== "relevance") retryParams.set("sort", sort);
  if (filterPriceMin) retryParams.set("priceMin", filterPriceMin);
  if (filterPriceMax) retryParams.set("priceMax", filterPriceMax);
  if (filterSizeMin) retryParams.set("sizeMin", filterSizeMin);
  if (filterSizeMax) retryParams.set("sizeMax", filterSizeMax);
  if (filterBuiltYearMin) retryParams.set("builtYearMin", filterBuiltYearMin);
  if (filterInvestmentSignal) retryParams.set("signal", filterInvestmentSignal);
  const retryQueryString = retryParams.toString();
  const retryHref = retryQueryString
    ? `/search?${retryQueryString}`
    : "/search";

  const createSortHref = (nextSort: SearchSortKey) => {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set("q", query);
    if (validType !== 1) nextParams.set("type", String(validType));
    if (nextSort !== "relevance") nextParams.set("sort", nextSort);
    if (filterPriceMin) nextParams.set("priceMin", filterPriceMin);
    if (filterPriceMax) nextParams.set("priceMax", filterPriceMax);
    if (filterSizeMin) nextParams.set("sizeMin", filterSizeMin);
    if (filterSizeMax) nextParams.set("sizeMax", filterSizeMax);
    if (filterBuiltYearMin) nextParams.set("builtYearMin", filterBuiltYearMin);
    if (filterInvestmentSignal) nextParams.set("signal", filterInvestmentSignal);

    const queryString = nextParams.toString();
    return queryString ? `/search?${queryString}` : "/search";
  };

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "아파트 검색", href: "/search" },
        ]}
      />
      <PropertyTypeFilter currentType={validType} />
      {hasSearch && (
        <SearchTracker
          query={query}
          resultCount={results.length}
          propertyType={validType}
        />
      )}
      <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-6">
        <div className="inline-flex items-center rounded-full border t-border bg-[var(--color-surface-card)] px-3 py-1 text-xs font-semibold t-text-secondary">
          <span className="mr-2 h-2 w-2 rounded-full bg-brand-500" />
          {searchModeLabel}
        </div>
        <h1 className="mt-3 text-3xl font-black t-text sm:text-4xl">아파트 검색</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 t-text-secondary">
          지역명과 단지명을 함께 입력하면 결과가 빠르게 좁혀집니다. 가격, 면적, 준공년도 필터로 관심 조건만 남겨보세요.
        </p>
      </section>

      {/* Search Form with Filters */}
      <form action="/search" method="GET" className="mb-8">
        {validType !== 1 && <input type="hidden" name="type" value={validType} />}
        {sort !== "relevance" && <input type="hidden" name="sort" value={sort} />}
        <input type="hidden" name="signal" value={filterInvestmentSignal ?? ""} />

        {/* Main search input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="지역+아파트명 검색 (예: 동대문 두산, 강남 원베일리, 송파 주공)"
            aria-label="아파트 검색어 입력"
            className="flex-1 rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
              color: "var(--color-text-primary)",
            }}
            autoFocus
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            검색
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold t-text-tertiary">추천 검색</span>
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <TrackedLink
              key={suggestion.query}
              href={searchSuggestionHref(suggestion.query, validType)}
              ctaName="search_suggestion_click"
              params={{
                query: suggestion.query,
                property_type: validType,
                surface: "form",
              }}
              className="rounded-full border t-border px-3 py-1.5 text-xs font-semibold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
            >
              {suggestion.label}
            </TrackedLink>
          ))}
        </div>
        <RecentSearches currentPropertyType={validType} />

        {/* Filter Section */}
        <details className="rounded-xl border t-border" style={{ background: "var(--color-surface-card)" }}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold t-text select-none flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--color-text-tertiary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            상세 필터
            {hasFilters && (
              <span className="rounded-full filter-tag px-2 py-0.5 text-xs font-medium">
                필터 적용됨
              </span>
            )}
          </summary>
          <div className="border-t t-border px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Price Range */}
              <div>
                <label className="mb-1.5 block text-xs font-medium t-text-secondary">
                  매매가 범위 (만원)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="priceMin"
                    defaultValue={filterPriceMin}
                    placeholder="최소"
                    className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-card)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <span className="text-xs t-text-tertiary">~</span>
                  <input
                    type="number"
                    name="priceMax"
                    defaultValue={filterPriceMax}
                    placeholder="최대"
                    className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-card)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <PricePresets />
              </div>

              {/* Size Range */}
              <div>
                <label className="mb-1.5 block text-xs font-medium t-text-secondary">
                  면적 범위 (m2)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="sizeMin"
                    defaultValue={filterSizeMin}
                    placeholder="최소"
                    step="0.1"
                    className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-card)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <span className="text-xs t-text-tertiary">~</span>
                  <input
                    type="number"
                    name="sizeMax"
                    defaultValue={filterSizeMax}
                    placeholder="최대"
                    step="0.1"
                    className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-card)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <SizePresets />
              </div>

              {/* Built Year */}
              <div>
                <label className="mb-1.5 block text-xs font-medium t-text-secondary">
                  최소 준공년도
                </label>
                <input
                  type="number"
                  name="builtYearMin"
                  defaultValue={filterBuiltYearMin}
                  placeholder="예: 2000"
                  min="1970"
                  max="2030"
                  className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface-card)",
                    color: "var(--color-text-primary)",
                  }}
                />
                <YearPresets />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium t-text-secondary">
                  투자 신호
                </label>
                <InvestmentSignalPresets currentSignal={filterInvestmentSignal} />
                <p className="mt-2 text-[11px] leading-5 t-text-tertiary">
                  검색어와 함께 사용할 때만 적용하며, 동일 면적의 최신 매매·전세가가 모두 있는 단지만 표시합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                필터 적용
              </button>
              <TrackedLink
                href="/search"
                ctaName="search_filter_reset_click"
                className="rounded-lg border t-border px-4 py-2 text-sm font-medium t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
              >
                필터 초기화
              </TrackedLink>
            </div>
          </div>
        </details>
      </form>

      {/* Active Filters Display */}
      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium t-text-tertiary">적용된 필터:</span>
          {filterPriceMin && (
            <span className="rounded-full filter-tag px-2.5 py-1 text-xs font-medium">
              최소 {formatPrice(parseInt(filterPriceMin))}
            </span>
          )}
          {filterPriceMax && (
            <span className="rounded-full filter-tag px-2.5 py-1 text-xs font-medium">
              최대 {formatPrice(parseInt(filterPriceMax))}
            </span>
          )}
          {filterSizeMin && (
            <span className="rounded-full filter-tag px-2.5 py-1 text-xs font-medium">
              {filterSizeMin}m2 이상
            </span>
          )}
          {filterSizeMax && (
            <span className="rounded-full filter-tag px-2.5 py-1 text-xs font-medium">
              {filterSizeMax}m2 이하
            </span>
          )}
          {filterBuiltYearMin && (
            <span className="rounded-full filter-tag px-2.5 py-1 text-xs font-medium">
              {filterBuiltYearMin}년 이후 준공
            </span>
          )}
          {filterInvestmentSignal && (
            <span className="rounded-full filter-tag px-2.5 py-1 text-xs font-medium">
              {investmentSignalLabel(filterInvestmentSignal)}
            </span>
          )}
        </div>
      )}

      {hasSearch && results.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 border-y t-border py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold t-text-tertiary">정렬</p>
            <p className="mt-0.5 text-sm font-semibold t-text">{resultLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2" role="list" aria-label="검색 결과 정렬">
            {SEARCH_SORT_OPTIONS.map((option) => {
              const isActive = option.value === sort;

              return (
                <TrackedLink
                  key={option.value}
                  href={createSortHref(option.value)}
                  ctaName="search_sort_click"
                  params={{
                    sort: option.value,
                    previous_sort: sort,
                    query: query || undefined,
                    has_filters: hasFilters,
                    result_count: results.length,
                  }}
                  ariaLabel={`${option.label}: ${option.description}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "border t-border t-text-secondary hover:bg-[var(--color-surface-elevated)]"
                  }`}
                >
                  {option.label}
                </TrackedLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {!hasSearch ? (
        <div className="rounded-2xl border-2 border-dashed p-8 text-center sm:p-12" style={{ borderColor: "var(--color-border)" }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl text-2xl" style={{ background: "var(--color-surface-elevated)" }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--color-text-tertiary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="mt-4 font-semibold t-text">{emptyTitle}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            전국 아파트의 최근 실거래가와 단지 기본 정보를 확인할 수 있습니다.
          </p>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <TrackedLink
                key={suggestion.query}
                href={searchSuggestionHref(suggestion.query, validType)}
                ctaName="search_suggestion_click"
                params={{
                  query: suggestion.query,
                  property_type: validType,
                  surface: "empty_state",
                }}
                className="rounded-full border t-border px-3 py-1.5 text-xs font-semibold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
              >
                {suggestion.label}
              </TrackedLink>
            ))}
          </div>
        </div>
      ) : searchFailure ? (
        <div className="rounded-2xl border-2 border-dashed p-8 text-center sm:p-12" style={{ borderColor: "var(--color-border)" }}>
          <p className="font-semibold t-text">{searchFailure.title}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {searchFailure.description}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <TrackedLink
              href={retryHref}
              ctaName="search_unavailable_retry_click"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              다시 시도
            </TrackedLink>
            <TrackedLink
              href="/market"
              ctaName="search_unavailable_market_click"
              className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
            >
              지역별 시세 보기
            </TrackedLink>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-8 text-center sm:p-12" style={{ borderColor: "var(--color-border)" }}>
          <p className="font-semibold t-text">{emptyTitle}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            검색어를 짧게 줄이거나 가격·면적 필터를 낮춰 다시 시도해 주세요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <TrackedLink
              href="/search"
              ctaName="search_empty_reset_click"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              조건 초기화
            </TrackedLink>
            <TrackedLink
              href="/market"
              ctaName="search_empty_market_click"
              className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
            >
              지역별 시세 보기
            </TrackedLink>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((apt, index) => {
              const detailHref = aptUrl({
                govtComplexId: apt.govt_complex_id,
                identityId: apt.identity_id,
                regionCode: apt.region_code,
                slug: apt.slug,
              });
              const compareHref = buildCompareHref([apt.id]);
              const activityDate = searchResultActivityDate(apt);
              const rentPrice = searchResultRentPrice(apt);
              const trackingParams = {
                rank: index + 1,
                query: query || undefined,
                has_filters: hasFilters,
                sort,
                region_code: apt.region_code,
                latest_trade_price: apt.latest_trade_price ?? undefined,
                latest_change_rate: apt.latest_change_rate ?? undefined,
              };

              return (
                <article
                  key={apt.id}
                  className="card-hover rounded-2xl border p-5 transition"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface-card)",
                  }}
                >
                  <TrackedLink
                    href={detailHref}
                    ctaName="search_result_title_click"
                    params={trackingParams}
                    className="block"
                  >
                    <p className="font-bold t-text truncate">
                      <HighlightedText text={apt.apt_name} query={query} />
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      <HighlightedText
                        text={[formatRegion(apt.region_code), apt.dong_name]
                          .filter(Boolean)
                          .join(" ")}
                        query={query}
                        markClassName="rounded bg-brand-50 px-0.5 text-brand-700"
                      />
                    </p>
                  </TrackedLink>
                  <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
                    {apt.built_year && (
                      <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {apt.built_year}년 준공
                      </span>
                    )}
                    {apt.total_units && (
                      <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {apt.total_units.toLocaleString()}세대
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3 border-t t-border pt-2">
                    <div className="min-w-0">
                      <span className="block text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                        {searchResultActivityLabel(apt)}
                      </span>
                      {activityDate && (
                        <span className="block truncate text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                          {activityDate}
                        </span>
                      )}
                    </div>
                    {apt.latest_trade_price ? (
                      <div className="shrink-0 text-right">
                        <span className="block text-sm font-bold tabular-nums t-text">
                          {formatPrice(apt.latest_trade_price)}
                        </span>
                        {apt.latest_change_rate !== null && (
                          <span
                            className={`block text-[11px] font-bold tabular-nums ${
                              apt.latest_change_rate < 0
                                ? "t-drop"
                                : apt.latest_change_rate > 0
                                  ? "t-rise"
                                  : "t-text-tertiary"
                            }`}
                          >
                            {apt.latest_change_rate > 0 ? "+" : ""}
                            {apt.latest_change_rate.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ) : rentPrice ? (
                      <div className="max-w-[13rem] shrink-0 text-right">
                        <span className="block whitespace-normal text-xs font-bold leading-5 tabular-nums t-text sm:text-sm">
                          {rentPrice}
                        </span>
                      </div>
                    ) : (
                      <span className="shrink-0 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                        거래 정보 없음
                      </span>
                    )}
                  </div>
                  {(apt.jeonse_ratio !== null || apt.gap_amount !== null) && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
                        <span className="block font-medium t-text-tertiary">전세가율</span>
                        <span className="mt-0.5 block font-bold tabular-nums t-text">
                          {apt.jeonse_ratio !== null ? `${apt.jeonse_ratio.toFixed(1)}%` : "-"}
                        </span>
                      </div>
                      <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
                        <span className="block font-medium t-text-tertiary">갭</span>
                        <span className="mt-0.5 block font-bold tabular-nums t-text">
                          {apt.gap_amount !== null ? formatPrice(apt.gap_amount) : "-"}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <TrackedLink
                      href={detailHref}
                      ctaName="search_result_to_detail"
                      params={trackingParams}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700"
                    >
                      상세 보기
                    </TrackedLink>
                    <TrackedLink
                      href={compareHref}
                      ctaName="search_result_compare_start"
                      params={{
                        ...trackingParams,
                        complex_id: apt.id,
                      }}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border t-border px-3 text-xs font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
                    >
                      비교 담기
                    </TrackedLink>
                  </div>
                </article>
              );
            })}
          </div>

          <AdSlot slotId="search-infeed" format="infeed" className="mt-6" />
        </>
      )}

        <SignalLandingFooter
          eventScope="search"
          methodTitle="검색 사용 기준"
          methodItems={[
            "검색어는 공백을 정리하고 최대 80자까지만 반영합니다.",
            "두 단어 이상 입력하면 첫 단어는 지역, 나머지는 단지명 중심으로 좁혀 찾습니다.",
            "가격·면적 필터는 최근 실거래가가 해당 조건에 맞는 단지를 우선 보여줍니다.",
            "검색 결과 카드를 누르면 단지 상세에서 가격 흐름, 거래 이력, 관심단지 저장을 이어갈 수 있습니다.",
          ]}
          relatedLinks={[
            {
              href: "/market",
              title: "지역별 시세",
              description: "검색 전 지역 흐름부터 넓게 훑어봅니다.",
            },
            {
              href: "/today",
              title: "오늘 하락 거래",
              description: "하락 신호가 강한 단지를 먼저 확인합니다.",
            },
            {
              href: "/new-highs",
              title: "오늘 신고가",
              description: "신고가가 나온 단지를 따로 모아봅니다.",
            },
            {
              href: "/rate",
              title: "대출 금리",
              description: "관심 단지 가격을 금리 부담과 함께 계산합니다.",
            },
          ]}
        />
    </div>
    </div>
  );
}
