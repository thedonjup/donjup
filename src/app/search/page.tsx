import Link from "next/link";
import type { Metadata } from "next";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";

type SearchPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  if (query) {
    return {
      title: `"${query}" 아파트 검색 결과`,
      description: `"${query}" 관련 전국 아파트 실거래가, 시세 변동, 매매 이력을 확인하세요. 돈줍에서 아파트 시세를 한눈에 비교.`,
      keywords: [
        `${query} 아파트`,
        `${query} 실거래가`,
        `${query} 시세`,
        "아파트 검색",
        "아파트 실거래가",
        "아파트 시세 조회",
      ],
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
  };
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const params = await searchParams;
  const { q, type: typeParam, priceMin, priceMax, sizeMin, sizeMax, builtYearMin } = params;
  const query = typeof q === "string" ? q.trim() : "";
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;

  // Parse filter values for display
  const filterPriceMin = typeof priceMin === "string" ? priceMin : "";
  const filterPriceMax = typeof priceMax === "string" ? priceMax : "";
  const filterSizeMin = typeof sizeMin === "string" ? sizeMin : "";
  const filterSizeMax = typeof sizeMax === "string" ? sizeMax : "";
  const filterBuiltYearMin = typeof builtYearMin === "string" ? builtYearMin : "";

  const hasFilters = filterPriceMin || filterPriceMax || filterSizeMin || filterSizeMax || filterBuiltYearMin;
  const hasSearch = query.length > 0 || hasFilters;

  let results: Array<{
    id: string;
    apt_name: string;
    region_code: string;
    region_name: string;
    dong_name: string | null;
    sido_name: string | null;
    sigungu_name: string | null;
    built_year: number | null;
    slug: string;
    latest_trade_price: number | null;
  }> = [];

  if (hasSearch) {
    try {
      const origin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      const apiParams = new URLSearchParams();
      if (query) apiParams.set("q", query);
      apiParams.set("type", String(validType));
      if (filterPriceMin) apiParams.set("priceMin", filterPriceMin);
      if (filterPriceMax) apiParams.set("priceMax", filterPriceMax);
      if (filterSizeMin) apiParams.set("sizeMin", filterSizeMin);
      if (filterSizeMax) apiParams.set("sizeMax", filterSizeMax);
      if (filterBuiltYearMin) apiParams.set("builtYearMin", filterBuiltYearMin);

      const res = await fetch(
        `${origin}/api/search?${apiParams.toString()}`,
        { next: { revalidate: 300 } }
      );
      const json = await res.json();
      results = (json.results ?? []).map((d: any) => ({
        ...d,
        sido_name: null,
        sigungu_name: null,
        latest_trade_price: null,
      }));
    } catch {
      // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
    }
  }

  return (
    <div>
      <PropertyTypeFilter currentType={validType} />
      <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text">아파트 검색</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          지역 + 아파트명으로 검색하고, 필터로 조건을 좁혀보세요
        </p>
      </div>

      {/* Search Form with Filters */}
      <form action="/search" method="GET" className="mb-8">
        {validType !== 1 && <input type="hidden" name="type" value={validType} />}

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
                <div className="mt-1 flex gap-1">
                  {[
                    { label: "3억 이하", min: "", max: "30000" },
                    { label: "3~6억", min: "30000", max: "60000" },
                    { label: "6~10억", min: "60000", max: "100000" },
                    { label: "10억+", min: "100000", max: "" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={(e) => {
                        const form = (e.target as HTMLElement).closest("form");
                        if (form) {
                          const minInput = form.querySelector<HTMLInputElement>('input[name="priceMin"]');
                          const maxInput = form.querySelector<HTMLInputElement>('input[name="priceMax"]');
                          if (minInput) minInput.value = preset.min;
                          if (maxInput) maxInput.value = preset.max;
                        }
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium t-elevated t-text-tertiary hover:t-text-secondary transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
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
                <div className="mt-1 flex gap-1">
                  {[
                    { label: "59m2(18평)", min: "59", max: "59.99" },
                    { label: "84m2(25평)", min: "84", max: "84.99" },
                    { label: "114m2(34평)", min: "114", max: "114.99" },
                    { label: "135m2+(40평+)", min: "135", max: "" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={(e) => {
                        const form = (e.target as HTMLElement).closest("form");
                        if (form) {
                          const minInput = form.querySelector<HTMLInputElement>('input[name="sizeMin"]');
                          const maxInput = form.querySelector<HTMLInputElement>('input[name="sizeMax"]');
                          if (minInput) minInput.value = preset.min;
                          if (maxInput) maxInput.value = preset.max;
                        }
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium t-elevated t-text-tertiary hover:t-text-secondary transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
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
                <div className="mt-1 flex gap-1">
                  {[
                    { label: "2020+", value: "2020" },
                    { label: "2010+", value: "2010" },
                    { label: "2000+", value: "2000" },
                    { label: "1990+", value: "1990" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={(e) => {
                        const form = (e.target as HTMLElement).closest("form");
                        if (form) {
                          const input = form.querySelector<HTMLInputElement>('input[name="builtYearMin"]');
                          if (input) input.value = preset.value;
                        }
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium t-elevated t-text-tertiary hover:t-text-secondary transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                필터 적용
              </button>
              <Link
                href="/search"
                className="rounded-lg border t-border px-4 py-2 text-sm font-medium t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
              >
                필터 초기화
              </Link>
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
        </div>
      )}

      {/* Results */}
      {!hasSearch ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl text-2xl" style={{ background: "var(--color-surface-elevated)" }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--color-text-tertiary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="mt-4 font-semibold t-text">아파트명 또는 지역명을 검색하세요</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            전국 아파트의 실거래가와 시세 변동을 확인할 수 있습니다
          </p>
        </div>
      ) : results.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">
            {query ? `"${query}"` : "해당 조건의"} 검색 결과가 없습니다
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            다른 검색어 또는 필터 조건으로 다시 시도해 주세요
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {query ? `"${query}"` : "필터"} 검색 결과 {results.length}건
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((apt) => (
              <Link
                key={apt.id}
                href={`/apt/${apt.region_code}/${apt.slug}`}
                className="card-hover block rounded-2xl border p-5 transition"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-card)",
                }}
              >
                <p className="font-bold t-text truncate">{apt.apt_name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {[apt.sido_name, apt.sigungu_name, apt.dong_name]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  {apt.built_year && (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {apt.built_year}년 준공
                    </span>
                  )}
                  {apt.latest_trade_price ? (
                    <span className="text-sm font-bold tabular-nums t-text">
                      {formatPrice(apt.latest_trade_price)}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      거래 정보 없음
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <AdSlot slotId="search-infeed" format="infeed" className="mt-6" />
        </>
      )}
    </div>
    </div>
  );
}
