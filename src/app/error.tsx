"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
        style={{ background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }}
      >
        !
      </div>
      <h1 className="mt-6 text-2xl font-extrabold t-text">오류가 발생했습니다</h1>
      <p className="mt-2 text-sm t-text-secondary">
        {error.message || "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
      >
        다시 시도
      </button>
    </div>
  );
}
