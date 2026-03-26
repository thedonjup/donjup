import Link from "next/link";

export default function SearchCTA() {
  return (
    <section className="border-b t-border">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link
          href="/search"
          className="group flex items-center justify-between rounded-2xl border-2 brand-tint-border brand-tint-bg px-6 py-5 transition-all hover:shadow-lg"
        >
          <div>
            <p className="text-lg font-extrabold brand-tint-text sm:text-xl">
              내 아파트는 얼마나 떨어졌을까?
            </p>
            <p className="mt-1 text-sm brand-tint-text-subtle">
              아파트명을 검색하면 최고가 대비 변동률을 바로 확인할 수 있어요
            </p>
          </div>
          <div className="ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-transform group-hover:scale-110">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </Link>
      </div>
    </section>
  );
}
