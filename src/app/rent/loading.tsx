export default function RentLoading() {
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
            className="h-7 w-56 rounded"
            style={{ background: "var(--color-border)" }}
          />
        </div>
        <div
          className="mt-2 h-4 w-72 rounded"
          style={{ background: "var(--color-border)" }}
        />
      </div>

      {/* Filter skeleton */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-14 rounded-full"
            style={{ background: "var(--color-surface-elevated)" }}
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-10">
        {[0, 1].map((section) => (
          <div key={section}>
            <div className="mb-4 flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-md"
                style={{ background: "var(--color-border)" }}
              />
              <div
                className="h-5 w-24 rounded"
                style={{ background: "var(--color-border)" }}
              />
            </div>
            <div
              className="rent-skeleton rounded-xl border p-4"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-card)",
              }}
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b py-3"
                  style={{
                    borderColor: "var(--color-border)",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div className="h-4 w-6 rounded" style={{ background: "var(--color-border)" }} />
                  <div className="h-4 w-28 rounded" style={{ background: "var(--color-border)" }} />
                  <div className="h-4 w-16 rounded" style={{ background: "var(--color-border)" }} />
                  <div className="ml-auto h-4 w-20 rounded" style={{ background: "var(--color-border)" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .rent-skeleton {
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
