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
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <div className="mt-8 flex gap-3">
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
