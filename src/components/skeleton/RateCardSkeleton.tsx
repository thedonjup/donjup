/**
 * Skeleton loading placeholder for rate cards (금리 현황 page).
 */
export default function RateCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border p-5"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-card)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div
                className="skeleton-pulse rounded"
                style={{ height: 14, width: 80 }}
              />
              <div
                className="skeleton-pulse mt-2 rounded"
                style={{ height: 32, width: 72 }}
              />
            </div>
            <div
              className="skeleton-pulse rounded-full"
              style={{ height: 24, width: 52 }}
            />
          </div>
          <div
            className="skeleton-pulse mt-2 rounded"
            style={{ height: 12, width: "80%", maxWidth: 200 }}
          />
          <div
            className="skeleton-pulse mt-1 rounded"
            style={{ height: 10, width: 100 }}
          />
          <div
            className="skeleton-pulse mt-3 rounded"
            style={{ height: 48, width: "100%" }}
          />
        </div>
      ))}

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
