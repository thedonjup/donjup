export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block h-5 w-1.5 rounded-full"
            style={{ background: "var(--color-border)" }}
          />
          <div
            className="h-7 w-32 rounded"
            style={{ background: "var(--color-border)" }}
          />
        </div>
        <div
          className="h-4 w-60 rounded"
          style={{ background: "var(--color-border)" }}
        />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-8 flex gap-2">
        <div
          className="flex-1 h-12 rounded-xl"
          style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-border)" }}
        />
        <div
          className="h-12 w-20 rounded-xl"
          style={{ background: "var(--color-border)" }}
        />
      </div>

      {/* Result cards skeleton */}
      <div
        className="mb-4 h-4 w-36 rounded"
        style={{ background: "var(--color-border)" }}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="search-skeleton-card rounded-2xl border p-5"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
              animationDelay: `${i * 80}ms`,
            }}
          >
            <div
              className="h-5 w-32 rounded"
              style={{ background: "var(--color-border)" }}
            />
            <div
              className="mt-2 h-3 w-40 rounded"
              style={{ background: "var(--color-border)" }}
            />
            <div className="mt-3 flex items-center justify-between">
              <div
                className="h-3 w-16 rounded"
                style={{ background: "var(--color-border)" }}
              />
              <div
                className="h-4 w-20 rounded"
                style={{ background: "var(--color-border)" }}
              />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .search-skeleton-card {
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
