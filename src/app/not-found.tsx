import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white">
        ₩
      </div>
      <h1 className="mt-6 text-4xl font-extrabold tabular-nums t-text">404</h1>
      <p className="mt-2 text-lg font-medium t-text-secondary">
        페이지를 찾을 수 없습니다
      </p>
      <p className="mt-1 text-sm t-text-tertiary">
        이 단지의 데이터를 아직 수집하지 못했습니다
      </p>

      {/* Search Form */}
      <form
        action="/search"
        method="GET"
        className="mt-8 flex w-full max-w-md gap-2"
      >
        <input
          type="text"
          name="q"
          placeholder="아파트명으로 검색 (예: 래미안, 자이)"
          className="flex-1 rounded-xl border px-4 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-card)",
            color: "var(--color-text-primary)",
          }}
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          검색
        </button>
      </form>

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          홈으로 가기
        </Link>
        <Link
          href="/market"
          className="rounded-xl border px-6 py-2.5 text-sm font-bold transition hover:opacity-80"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
        >
          지역별 시세
        </Link>
      </div>
    </div>
  );
}
