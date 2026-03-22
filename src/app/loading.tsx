export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero skeleton */}
      <div className="animate-pulse rounded-2xl p-8" style={{ background: "var(--color-surface-elevated)" }}>
        <div className="h-3 w-24 rounded" style={{ background: "var(--color-border)" }} />
        <div className="mt-4 h-8 w-2/3 rounded" style={{ background: "var(--color-border)" }} />
        <div className="mt-3 h-4 w-1/2 rounded" style={{ background: "var(--color-border)" }} />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--color-surface-card)" }}>
              <div className="h-3 w-12 rounded" style={{ background: "var(--color-border)" }} />
              <div className="mt-2 h-6 w-16 rounded" style={{ background: "var(--color-border)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3 rounded-xl border p-4"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
            >
              <div className="h-7 w-7 rounded-lg" style={{ background: "var(--color-border)" }} />
              <div className="flex-1">
                <div className="h-4 w-32 rounded" style={{ background: "var(--color-border)" }} />
                <div className="mt-2 h-3 w-20 rounded" style={{ background: "var(--color-border)" }} />
              </div>
              <div className="h-5 w-16 rounded" style={{ background: "var(--color-border)" }} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div
            className="animate-pulse rounded-2xl border p-5"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
          >
            <div className="h-4 w-16 rounded" style={{ background: "var(--color-border)" }} />
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-20 rounded" style={{ background: "var(--color-border)" }} />
                  <div className="h-4 w-12 rounded" style={{ background: "var(--color-border)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
