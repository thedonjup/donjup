/**
 * Skeleton loading placeholder for ranking card lists.
 * Used as a loading state for RankingTabs and similar card lists.
 */
export default function RankingCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {/* Tab skeleton */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ background: "var(--color-surface-elevated)" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-pulse flex-1 rounded-lg"
            style={{ height: 40 }}
          />
        ))}
      </div>

      {/* Card skeletons */}
      <div className="mt-4 space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border px-4 py-3.5"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
            }}
          >
            {/* Rank badge */}
            <div
              className="skeleton-pulse flex-shrink-0 rounded-lg"
              style={{ width: 28, height: 28 }}
            />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div
                className="skeleton-pulse rounded"
                style={{ height: 16, width: "60%", maxWidth: 160 }}
              />
              <div
                className="skeleton-pulse mt-1.5 rounded"
                style={{ height: 12, width: "40%", maxWidth: 120 }}
              />
            </div>

            {/* Price */}
            <div className="flex-shrink-0 text-right">
              <div
                className="skeleton-pulse ml-auto rounded"
                style={{ height: 16, width: 72 }}
              />
              <div
                className="skeleton-pulse mt-1.5 ml-auto rounded"
                style={{ height: 12, width: 48 }}
              />
            </div>
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
