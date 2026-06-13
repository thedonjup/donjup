"use client";

import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { formatPrice, formatRegion } from "@/lib/format";
import { aptUrl } from "@/lib/apt-url";
import TrackedLink from "@/components/analytics/TrackedLink";
import { trackCtaClick } from "@/lib/analytics/events";
import {
  buildCompareIdsParam,
  compareEmptyTitle,
  compareSelectionStatus,
  latestTradePriceRange,
  normalizeCompareSearchQuery,
  parseCompareIds,
  shouldSearchCompareQuery,
  validLatestTradeCount,
} from "@/lib/compare-selection";
import {
  fetchJson,
  messageFromUnknownError,
} from "@/lib/public-api-error";

interface Complex {
  id: string;
  apt_name: string;
  region_code: string;
  region_name?: string;
  dong_name: string | null;
  built_year: number | null;
  slug: string;
  govt_complex_id?: string | null;
  total_units?: number | null;
}

interface CompareData {
  complex: Complex;
  latestTrade: {
    trade_price: number;
    trade_date: string;
    size_sqm: number;
    floor: number;
  } | null;
  highestPrice: number | null;
  lowestRecent: number | null;
  tradeCount: number;
  latestRent: {
    deposit: number;
    monthly_rent: number;
    rent_type: string;
  } | null;
}

interface AptApiResponse {
  complex?: Complex;
  transactions?: Array<{
    trade_price: number;
    trade_date: string;
    size_sqm: number;
    floor: number;
  }>;
  rents?: Array<{
    deposit: number;
    monthly_rent: number;
    rent_type: string;
  }>;
}

interface SearchApiResponse {
  results?: Complex[];
}

const QUICK_COMPARE_QUERIES = ["강남 래미안", "송파 주공", "마포 자이", "분당 파크뷰"];

async function fetchCompareDataById(id: string): Promise<CompareData> {
  const json = await fetchJson<AptApiResponse>(
    `/api/apt/${encodeURIComponent(id)}`,
    undefined,
    "단지 데이터를 불러오지 못했습니다"
  );
  if (!json.complex) throw new Error("단지 정보가 없습니다");

  return buildCompareData(json.complex, json);
}

async function fetchCompareData(complex: Complex): Promise<CompareData> {
  const id = complex.id || complex.govt_complex_id || complex.slug;
  return fetchCompareDataById(id);
}

function buildCompareData(complex: Complex, json: AptApiResponse): CompareData {
  const transactions = json.transactions ?? [];
  const rents = json.rents ?? [];

  const latestTrade = transactions.length > 0
    ? {
        trade_price: Number(transactions[0].trade_price),
        trade_date: transactions[0].trade_date,
        size_sqm: Number(transactions[0].size_sqm),
        floor: Number(transactions[0].floor),
      }
    : null;

  const prices = transactions.map((t) => Number(t.trade_price)).filter(Number.isFinite);
  const highestPrice = prices.length > 0 ? Math.max(...prices) : null;
  const recentPrices = prices.slice(0, 10);
  const lowestRecent = recentPrices.length > 0 ? Math.min(...recentPrices) : null;

  const latestRent = rents.length > 0
    ? {
        deposit: Number(rents[0].deposit),
        monthly_rent: Number(rents[0].monthly_rent),
        rent_type: rents[0].rent_type,
      }
    : null;

  return {
    complex,
    latestTrade,
    highestPrice,
    lowestRecent,
    tradeCount: transactions.length,
    latestRent,
  };
}

export default function ComparePage() {
  const initialIds = useMemo(() => {
    if (typeof window === "undefined") return [];
    const params = new URLSearchParams(window.location.search);
    return parseCompareIds(params.get("ids"));
  }, []);
  const didLoadInitialIds = useRef(false);
  const searchRequestSeq = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Complex[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CompareData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialIds.length === 0 || didLoadInitialIds.current) return;

    didLoadInitialIds.current = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void Promise.allSettled(initialIds.map(fetchCompareDataById))
        .then((results) => {
          const loaded = results
            .filter((result): result is PromiseFulfilledResult<CompareData> => result.status === "fulfilled")
            .map((result) => result.value);

          if (loaded.length === 0) {
            const rejected = results.find(
              (result): result is PromiseRejectedResult => result.status === "rejected"
            );
            setError(
              messageFromUnknownError(
                rejected?.reason,
                "비교할 단지를 불러오지 못했습니다"
              )
            );
            return;
          }

          setSelected((prev) => {
            const next = [...prev];
            for (const item of loaded) {
              if (!next.some((selectedItem) => selectedItem.complex.id === item.complex.id)) {
                next.push(item);
              }
              if (next.length >= 3) break;
            }
            return next;
          });
        })
        .catch((e: unknown) =>
          setError(messageFromUnknownError(e, "비교할 단지를 불러오지 못했습니다"))
        )
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialIds]);

  const doSearch = useCallback(async (q: string) => {
    const normalizedQuery = normalizeCompareSearchQuery(q);
    const requestId = searchRequestSeq.current + 1;
    searchRequestSeq.current = requestId;

    if (!shouldSearchCompareQuery(normalizedQuery)) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const json = await fetchJson<SearchApiResponse>(
        `/api/search?q=${encodeURIComponent(normalizedQuery)}`,
        undefined,
        "검색 결과를 불러오지 못했습니다"
      );
      if (searchRequestSeq.current === requestId) {
        setSearchResults(json.results ?? []);
      }
    } catch (e: unknown) {
      if (searchRequestSeq.current === requestId) {
        setSearchResults([]);
        setSearchError(messageFromUnknownError(e, "검색 결과를 불러오지 못했습니다"));
      }
    } finally {
      if (searchRequestSeq.current === requestId) {
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void doSearch(searchQuery);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const addComplex = useCallback(async (complex: Complex) => {
    if (selected.length >= 3) return;
    if (selected.some((s) => s.complex.id === complex.id)) return;

    setLoading(true);
    setError(null);
    try {
      const compareData = await fetchCompareData(complex);

      setSelected((prev) => [
        ...prev,
        compareData,
      ]);
      trackCtaClick("compare_add_complex", {
        complex_id: complex.id,
        region_code: complex.region_code,
        selected_count: selected.length + 1,
      });
    } catch (e: unknown) {
      setError(messageFromUnknownError(e, "데이터를 불러올 수 없습니다"));
      setSelected((prev) => [
        ...prev,
        {
          complex,
          latestTrade: null,
          highestPrice: null,
          lowestRecent: null,
          tradeCount: 0,
          latestRent: null,
        },
      ]);
      trackCtaClick("compare_add_complex_fallback", {
        complex_id: complex.id,
        region_code: complex.region_code,
      });
    }
    setLoading(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
  }, [selected]);

  const removeComplex = useCallback((id: string) => {
    trackCtaClick("compare_remove_complex", { complex_id: id });
    setSelected((prev) => prev.filter((s) => s.complex.id !== id));
  }, []);

  const selectedIdsParam = useMemo(
    () => buildCompareIdsParam(selected.map((item) => item.complex.id)),
    [selected],
  );
  const selectedStatus = compareSelectionStatus(selected.length);
  const readyToCompare = selected.length >= 2;
  const emptyTitle = compareEmptyTitle(selected.length);
  const priceRange = latestTradePriceRange(selected);
  const validTradeCount = validLatestTradeCount(selected);
  const normalizedSearchQuery = normalizeCompareSearchQuery(searchQuery);
  const showSearchHint = normalizedSearchQuery.length > 0 && !shouldSearchCompareQuery(normalizedSearchQuery);
  const compareSharePath = selectedIdsParam ? `/compare?ids=${encodeURIComponent(selectedIdsParam)}` : "/compare";

  const copyCompareLink = useCallback(() => {
    const url = `${window.location.origin}${compareSharePath}`;
    trackCtaClick("compare_copy_link_click", {
      selected_count: selected.length,
      has_ids: selectedIdsParam.length > 0,
    });

    if (!navigator.clipboard) {
      setCopied(false);
      return;
    }

    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => setCopied(false));
  }, [compareSharePath, selected.length, selectedIdsParam.length]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8 border-b t-border pb-6">
        <div className="inline-flex items-center rounded-full border t-border bg-[var(--color-surface-card)] px-3 py-1 text-xs font-semibold t-text-secondary">
          <span className="mr-2 h-2 w-2 rounded-full bg-brand-500" />
          의사결정 비교판
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black t-text sm:text-4xl">단지 비교</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 t-text-secondary">
              최대 3개 단지를 나란히 놓고 최근 거래가, 최고가, 전월세 참고값, 거래 건수를 비교하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TrackedLink
              href="/search"
              ctaName="compare_header_search_click"
              className="inline-flex min-h-10 items-center rounded-lg border t-border px-3 text-xs font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
            >
              단지 검색
            </TrackedLink>
            <button
              type="button"
              onClick={copyCompareLink}
              className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700"
            >
              {copied ? "복사 완료" : "비교 링크 복사"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CompareStatCard
            label="선택 상태"
            value={selectedStatus}
            hint={readyToCompare ? "비교표를 볼 수 있습니다" : "최소 2개 단지를 선택하세요"}
          />
          <CompareStatCard
            label="최근 거래 확보"
            value={selected.length > 0 ? `${validTradeCount}/${selected.length}개` : "0개"}
            hint="최근 거래가가 있는 단지 수입니다"
          />
          <CompareStatCard
            label="가격 차이"
            value={priceRange ? formatPrice(priceRange.spread) : "-"}
            hint={priceRange ? `${formatPrice(priceRange.min)} ~ ${formatPrice(priceRange.max)}` : "최근 거래가를 불러오면 표시됩니다"}
          />
          <CompareStatCard
            label="다음 행동"
            value={readyToCompare ? "후보 좁히기" : "단지 추가"}
            hint="비교 뒤 상세·계산기·지역 시세로 이어집니다"
          />
        </div>
      </section>

      {/* Search to Add */}
      {selected.length < 3 && (
        <section className="mb-8">
          <div className="rounded-2xl border t-border t-card p-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold t-text">단지 추가 ({selectedStatus})</p>
                <p className="mt-1 text-xs t-text-tertiary">
                  2글자 이상 입력하면 자동으로 후보를 찾습니다.
                </p>
              </div>
              <span className="text-xs font-semibold t-text-tertiary">
                최대 3개까지 비교
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder="아파트명 또는 지역+아파트명 검색 (예: 강남 래미안)"
                aria-label="비교할 아파트 검색"
                className="flex-1 rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-card)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold t-text-tertiary">빠른 검색</span>
              {QUICK_COMPARE_QUERIES.map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => {
                    trackCtaClick("compare_quick_search_click", { query });
                    setSearchQuery(query);
                  }}
                  className="rounded-full border t-border px-3 py-1.5 text-xs font-semibold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
                >
                  {query}
                </button>
              ))}
            </div>
            {showSearchHint && (
              <p className="mt-2 text-xs t-text-tertiary">
                한 글자 검색은 결과가 너무 넓어집니다. 지역명이나 단지명을 조금 더 입력해 주세요.
              </p>
            )}

            {/* Search Results Dropdown */}
            {(searching || searchError || searchResults.length > 0 || shouldSearchCompareQuery(normalizedSearchQuery)) && normalizedSearchQuery.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border t-border" style={{ background: "var(--color-surface-card)" }}>
                {searching ? (
                  <div className="p-4 text-center text-sm t-text-tertiary">검색 중...</div>
                ) : searchError ? (
                  <div className="p-4 text-center">
                    <p className="text-sm font-semibold t-text">{searchError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        trackCtaClick("compare_search_retry_click", {
                          query: normalizedSearchQuery,
                        });
                        void doSearch(normalizedSearchQuery);
                      }}
                      className="mt-3 inline-flex min-h-9 items-center rounded-lg border t-border px-3 text-xs font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
                    >
                      다시 시도
                    </button>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm t-text-tertiary">검색 결과가 없습니다</div>
                ) : (
                  searchResults.map((apt) => {
                    const alreadyAdded = selected.some((s) => s.complex.id === apt.id);
                    return (
                      <button
                        key={apt.id}
                        onClick={() => {
                          if (alreadyAdded) return;
                          trackCtaClick("compare_search_result_add_click", {
                            complex_id: apt.id,
                            region_code: apt.region_code,
                            query: normalizedSearchQuery,
                          });
                          void addComplex(apt);
                        }}
                        disabled={alreadyAdded || loading}
                        className={`flex w-full items-center justify-between border-b last:border-b-0 t-border px-4 py-3 text-left text-sm transition ${
                          alreadyAdded
                            ? "opacity-40"
                            : "hover:bg-[var(--color-surface-elevated)]"
                        }`}
                      >
                        <div>
                          <p className="font-semibold t-text">{apt.apt_name}</p>
                          <p className="text-xs t-text-tertiary">
                            {formatRegion(apt.region_code)} {apt.dong_name ?? ""}
                            {apt.built_year ? ` | ${apt.built_year}년` : ""}
                          </p>
                        </div>
                        {alreadyAdded ? (
                          <span className="text-xs t-text-tertiary">추가됨</span>
                        ) : (
                          <span className="text-xs font-semibold text-brand-600">+ 추가</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mb-4 text-center text-sm t-text-tertiary">데이터를 불러오는 중...</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</div>
      )}

      {/* Selected Complexes Tags */}
      {selected.length > 0 && (
        <section className="mb-6">
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span
                key={s.complex.id}
                className="inline-flex items-center gap-1.5 rounded-full brand-tint-bg px-3 py-1.5 text-sm font-medium text-brand-600"
              >
                {s.complex.apt_name}
                <button
                  onClick={() => removeComplex(s.complex.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-brand-100"
                  aria-label={`${s.complex.apt_name} 제거`}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Comparison Table */}
      {selected.length >= 2 ? (
        <section>
          <div className="overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="pb-3 pr-4 text-left text-xs font-medium t-text-tertiary w-32">
                    항목
                  </th>
                  {selected.map((s) => (
                    <th key={s.complex.id} className="pb-3 px-2 text-center text-xs font-bold t-text">
                      <TrackedLink
                        href={aptUrl({ govtComplexId: s.complex.govt_complex_id ?? null, regionCode: s.complex.region_code, slug: s.complex.slug })}
                        ctaName="compare_table_detail_click"
                        params={{
                          complex_id: s.complex.id,
                          region_code: s.complex.region_code,
                          selected_count: selected.length,
                        }}
                        className="hover:text-brand-600"
                      >
                        {s.complex.apt_name}
                      </TrackedLink>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="지역">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center t-text-secondary">
                      {formatRegion(s.complex.region_code)}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="준공년도">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text">
                      {s.complex.built_year ? `${s.complex.built_year}년` : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="세대수">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text">
                      {s.complex.total_units ? `${s.complex.total_units.toLocaleString()}세대` : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최근 거래가">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center font-bold tabular-nums t-text">
                      {s.latestTrade ? formatPrice(s.latestTrade.trade_price) : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최근 거래일">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text-secondary text-xs">
                      {s.latestTrade?.trade_date ?? "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최고가">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center font-bold tabular-nums t-rise">
                      {s.highestPrice ? formatPrice(s.highestPrice) : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최근 최저가">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center font-bold tabular-nums t-drop">
                      {s.lowestRecent ? formatPrice(s.lowestRecent) : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="전세/보증금">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text">
                      {s.latestRent
                        ? `${formatPrice(s.latestRent.deposit)}${s.latestRent.monthly_rent > 0 ? ` / ${s.latestRent.monthly_rent}만` : ""}`
                        : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="전세가율">
                  {selected.map((s) => {
                    let ratio = "-";
                    if (s.latestRent && s.latestTrade && s.latestRent.rent_type === "전세" && s.latestTrade.trade_price > 0) {
                      ratio = `${((s.latestRent.deposit / s.latestTrade.trade_price) * 100).toFixed(1)}%`;
                    }
                    return (
                      <td key={s.complex.id} className="py-3 px-2 text-center font-semibold tabular-nums t-text">
                        {ratio}
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="거래 건수">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text-secondary">
                      {s.tradeCount.toLocaleString()}건
                    </td>
                  ))}
                </CompareRow>
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <TrackedLink
              href={`/rate/calculator${priceRange ? `?tab=loan&principal=${priceRange.min}` : ""}`}
              ctaName="compare_next_calculator_click"
              params={{
                selected_count: selected.length,
                min_latest_price: priceRange?.min,
              }}
              className="rounded-xl border t-border t-card p-4 transition hover:bg-[var(--color-surface-elevated)]"
            >
              <p className="text-sm font-bold t-text">대출 부담 계산</p>
              <p className="mt-1 text-xs leading-5 t-text-tertiary">
                낮은 후보 가격 기준으로 월 상환액을 가늠합니다.
              </p>
            </TrackedLink>
            <TrackedLink
              href="/market"
              ctaName="compare_next_market_click"
              params={{ selected_count: selected.length }}
              className="rounded-xl border t-border t-card p-4 transition hover:bg-[var(--color-surface-elevated)]"
            >
              <p className="text-sm font-bold t-text">지역 흐름 확인</p>
              <p className="mt-1 text-xs leading-5 t-text-tertiary">
                후보 단지가 속한 지역의 하락·신고가 신호를 넓게 봅니다.
              </p>
            </TrackedLink>
            <TrackedLink
              href="/search"
              ctaName="compare_next_search_click"
              params={{ selected_count: selected.length }}
              className="rounded-xl border t-border t-card p-4 transition hover:bg-[var(--color-surface-elevated)]"
            >
              <p className="text-sm font-bold t-text">후보 더 찾기</p>
              <p className="mt-1 text-xs leading-5 t-text-tertiary">
                비슷한 지역이나 브랜드 단지를 추가로 검색합니다.
              </p>
            </TrackedLink>
          </div>
        </section>
      ) : selected.length === 1 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">{emptyTitle}</p>
          <p className="mt-1 text-sm t-text-tertiary">
            최소 2개 단지를 선택해야 비교표가 표시됩니다
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">{emptyTitle}</p>
          <p className="mt-1 text-sm t-text-tertiary">
            최대 3개 단지를 선택하여 시세와 정보를 비교할 수 있습니다
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {QUICK_COMPARE_QUERIES.slice(0, 3).map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => {
                  trackCtaClick("compare_empty_quick_search_click", { query });
                  setSearchQuery(query);
                }}
                className="rounded-full border t-border px-3 py-1.5 text-xs font-semibold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="mt-10 border-t t-border pt-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="text-lg font-extrabold t-text">비교 기준</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 t-text-secondary">
              <li>최근 거래가는 각 단지 상세 API에서 내려온 최신 거래를 기준으로 표시합니다.</li>
              <li>최고가와 최근 최저가는 로드된 거래 내역 안에서 계산합니다.</li>
              <li>전세가율은 최신 전세 보증금과 최신 매매가가 모두 있을 때만 표시합니다.</li>
              <li>비교 링크를 복사하면 선택한 단지를 같은 조합으로 다시 열 수 있습니다.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-extrabold t-text">다음에 볼 화면</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TrackedLink
                href="/today"
                ctaName="compare_footer_related_click"
                params={{ href: "/today" }}
                className="rounded-lg border t-border t-card p-4 transition hover:bg-[var(--color-surface-elevated)]"
              >
                <p className="text-sm font-bold t-text">오늘 하락 거래</p>
                <p className="mt-1 text-xs leading-5 t-text-tertiary">후보 단지와 비슷한 하락 신호를 확인합니다.</p>
              </TrackedLink>
              <TrackedLink
                href="/new-highs"
                ctaName="compare_footer_related_click"
                params={{ href: "/new-highs" }}
                className="rounded-lg border t-border t-card p-4 transition hover:bg-[var(--color-surface-elevated)]"
              >
                <p className="text-sm font-bold t-text">오늘 신고가</p>
                <p className="mt-1 text-xs leading-5 t-text-tertiary">상승 신호가 강한 단지를 같이 봅니다.</p>
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CompareStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border t-border bg-[var(--color-surface-card)] p-4">
      <p className="text-[11px] font-semibold t-text-tertiary">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums t-text">{value}</p>
      <p className="mt-1 text-xs leading-5 t-text-tertiary">{hint}</p>
    </div>
  );
}

function CompareRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr className="border-b t-border transition hover:bg-[var(--color-surface-elevated)]">
      <td className="py-3 pr-4 text-xs font-medium t-text-tertiary">{label}</td>
      {children}
    </tr>
  );
}
