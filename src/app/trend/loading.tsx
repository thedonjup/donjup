export default function TrendLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-5 w-1.5 rounded-full"
            style={{ background: "var(--color-border)" }}
          />
          <div
            className="h-7 w-48 rounded"
            style={{ background: "var(--color-border)" }}
          />
        </div>
        <div
          className="mt-2 h-4 w-72 rounded"
          style={{ background: "var(--color-border)" }}
        />
      </div>

      {/* Stat cards skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="trend-skeleton rounded-xl border p-4"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
              animationDelay: `${i * 80}ms`,
            }}
          >
            <div className="h-3 w-20 rounded" style={{ background: "var(--color-border)" }} />
            <div className="mt-2 h-6 w-28 rounded" style={{ background: "var(--color-border)" }} />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div
        className="trend-skeleton mb-10 rounded-xl border p-5"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-card)",
          height: 220,
        }}
      >
        <div className="flex h-full items-end gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md"
              style={{
                background: "var(--color-border)",
                height: `${30 + Math.random() * 60}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div
        className="trend-skeleton rounded-xl border p-4"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-card)",
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b py-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="h-4 w-6 rounded" style={{ background: "var(--color-border)" }} />
            <div className="h-4 w-16 rounded" style={{ background: "var(--color-border)" }} />
            <div className="ml-auto h-4 w-20 rounded" style={{ background: "var(--color-border)" }} />
            <div className="h-4 w-16 rounded" style={{ background: "var(--color-border)" }} />
          </div>
        ))}
      </div>

      <style>{`
        .trend-skeleton {
          animation: skeleton-fade 1.2s ease-in-out infinite;
        }
        @keyframes skeleton-fade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
