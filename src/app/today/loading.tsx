import TransactionTableSkeleton from "@/components/skeleton/TransactionTableSkeleton";

export default function TodayLoading() {
  return (
    <div>
      {/* PropertyTypeFilter placeholder */}
      <div
        className="border-b"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-pulse rounded-full"
              style={{ height: 32, width: 72, flexShrink: 0 }}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
            <div
              className="skeleton-pulse rounded"
              style={{ height: 28, width: 140 }}
            />
          </div>
          <div
            className="skeleton-pulse mt-2 rounded"
            style={{ height: 14, width: "60%", maxWidth: 320 }}
          />
        </div>

        <TransactionTableSkeleton count={10} />
      </div>

      <style>{`
        .skeleton-pulse {
          background: linear-gradient(
            90deg,
            var(--color-surface-elevated) 25%,
            var(--color-surface-inset) 37%,
            var(--color-surface-elevated) 63%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.4s ease infinite;
        }
        @keyframes skeleton-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
