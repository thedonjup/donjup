/**
 * Skeleton loading placeholder for transaction tables (today page).
 * Shows a mobile-friendly card skeleton on small screens and a table skeleton on desktop.
 */
export default function TransactionTableSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      {/* Mobile: card-style skeleton */}
      <div className="space-y-2 sm:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border p-4"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="skeleton-pulse rounded"
                style={{ height: 16, width: "50%", maxWidth: 140 }}
              />
              <div
                className="skeleton-pulse rounded"
                style={{ height: 16, width: 64 }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="skeleton-pulse rounded"
                style={{ height: 12, width: "30%", maxWidth: 100 }}
              />
              <div
                className="skeleton-pulse rounded"
                style={{ height: 12, width: 40 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table skeleton */}
      <div
        className="hidden sm:block overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-card)",
        }}
      >
        {/* Header */}
        <div
          className="flex gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-elevated)" }}
        >
          {[120, 80, 60, 40, 70, 60, 50].map((w, i) => (
            <div
              key={i}
              className="skeleton-pulse rounded"
              style={{ height: 12, width: w, flexShrink: 0 }}
            />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <div className="flex-1">
              <div
                className="skeleton-pulse rounded"
                style={{ height: 14, width: "70%", maxWidth: 140 }}
              />
              <div
                className="skeleton-pulse mt-1 rounded"
                style={{ height: 10, width: "40%", maxWidth: 80 }}
              />
            </div>
            <div
              className="skeleton-pulse rounded"
              style={{ height: 14, width: 60, flexShrink: 0 }}
            />
            <div
              className="skeleton-pulse rounded"
              style={{ height: 14, width: 40, flexShrink: 0 }}
            />
            <div
              className="skeleton-pulse rounded"
              style={{ height: 14, width: 30, flexShrink: 0 }}
            />
            <div
              className="skeleton-pulse rounded"
              style={{ height: 14, width: 64, flexShrink: 0 }}
            />
            <div
              className="skeleton-pulse rounded"
              style={{ height: 14, width: 48, flexShrink: 0 }}
            />
            <div
              className="skeleton-pulse rounded"
              style={{ height: 14, width: 40, flexShrink: 0 }}
            />
          </div>
        ))}
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
