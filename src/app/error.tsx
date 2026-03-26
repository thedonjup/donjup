"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white">
        ₩
      </div>
      <h1 className="mt-6 text-2xl font-extrabold t-text">일시적인 오류가 발생했습니다</h1>
      <p className="mt-2 text-sm t-text-secondary">잠시 후 다시 시도해 주세요.</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-xl border px-6 py-2.5 text-sm font-bold transition hover:opacity-80"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
