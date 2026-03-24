import RateCardSkeleton from "@/components/skeleton/RateCardSkeleton";

export default function RateLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <div
            className="skeleton-pulse rounded"
            style={{ height: 28, width: 120 }}
          />
        </div>
        <div
          className="skeleton-pulse mt-1 rounded"
          style={{ height: 14, width: "60%", maxWidth: 320 }}
        />
      </div>

      <RateCardSkeleton count={5} />

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
