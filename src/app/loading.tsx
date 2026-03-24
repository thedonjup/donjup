import RankingCardSkeleton from "@/components/skeleton/RankingCardSkeleton";

export default function Loading() {
  return (
    <div>
      {/* Hero skeleton */}
      <section
        className="hero-gradient text-white"
        style={{ minHeight: 200 }}
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="flex items-center gap-2">
            <div className="skeleton-pulse-dark h-2 w-2 rounded-full" />
            <div className="skeleton-pulse-dark h-3 rounded" style={{ width: 160 }} />
          </div>
          <div className="mt-6 skeleton-pulse-dark h-10 rounded-lg" style={{ width: "80%", maxWidth: 480 }} />
          <div className="mt-3 skeleton-pulse-dark h-10 rounded-lg" style={{ width: "60%", maxWidth: 360 }} />
          <div className="mt-4 skeleton-pulse-dark h-5 rounded" style={{ width: "70%", maxWidth: 400 }} />
        </div>
      </section>

      {/* Stats bar skeleton */}
      <section
        className="border-b"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
      >
        <div className="mx-auto flex max-w-6xl items-stretch">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center border-r last:border-r-0 px-4 py-4 sm:px-6" style={{ borderColor: "var(--color-border)" }}>
              <div className="skeleton-pulse rounded" style={{ height: 12, width: 64 }} />
              <div className="skeleton-pulse mt-2 rounded" style={{ height: 24, width: 48 }} />
            </div>
          ))}
        </div>
      </section>

      {/* Main content skeleton */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RankingCardSkeleton count={5} />
          </div>
          <aside className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
                >
                  <div className="mx-auto skeleton-pulse rounded-lg" style={{ width: 40, height: 40 }} />
                  <div className="mx-auto mt-2 skeleton-pulse rounded" style={{ height: 14, width: 64 }} />
                  <div className="mx-auto mt-1 skeleton-pulse rounded" style={{ height: 10, width: 80 }} />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .skeleton-pulse-dark {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.06) 25%,
            rgba(255,255,255,0.12) 37%,
            rgba(255,255,255,0.06) 63%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.4s ease infinite;
        }
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
