import Link from "next/link";

const QUICK_SEARCHES = [
  "강남 재건축",
  "마포 래미안",
  "송파 주공",
  "분당",
  "동탄",
];

export default function SearchCTA() {
  return (
    <section className="border-b t-border">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-2xl border brand-tint-border brand-tint-bg p-4 sm:p-5">
          <form action="/search" method="GET" className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="home-search">
              아파트 검색어
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="아파트명, 동네, 지역을 검색해보세요"
              className="min-h-12 flex-1 rounded-xl border border-white/40 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              autoComplete="off"
            />
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              검색
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {QUICK_SEARCHES.map((query) => (
              <Link
                key={query}
                href={`/search?q=${encodeURIComponent(query)}`}
                className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white hover:text-brand-700"
              >
                {query}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
