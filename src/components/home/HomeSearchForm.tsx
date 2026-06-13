"use client";

import TrackedLink from "@/components/analytics/TrackedLink";
import { trackCtaClick } from "@/lib/analytics/events";

const QUICK_SEARCHES = ["강남 재건축", "마포 래미안", "송파 주공", "분당", "동탄"];

export default function HomeSearchForm() {
  return (
    <>
      <form
        action="/search"
        method="GET"
        className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          const query = String(formData.get("q") ?? "").trim();
          trackCtaClick("home_primary_search_submit", {
            has_query: query.length > 0,
            query_length: query.length,
          });
        }}
      >
        <label className="sr-only" htmlFor="home-signal-search">
          아파트 검색어
        </label>
        <input
          id="home-signal-search"
          name="q"
          type="search"
          placeholder="아파트명, 동네, 지역을 검색해보세요"
          className="min-h-12 flex-1 rounded-lg border t-border bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:bg-slate-950 dark:text-white"
          autoComplete="off"
        />
        <button
          type="submit"
          className="min-h-12 rounded-lg bg-brand-600 px-5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          검색
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK_SEARCHES.map((query) => (
          <TrackedLink
            key={query}
            href={`/search?q=${encodeURIComponent(query)}`}
            ctaName="home_quick_search_click"
            params={{ query }}
            className="rounded-full border t-border bg-[var(--color-surface-page)] px-3 py-1.5 text-xs font-semibold t-text-secondary transition hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300"
          >
            {query}
          </TrackedLink>
        ))}
      </div>
    </>
  );
}
