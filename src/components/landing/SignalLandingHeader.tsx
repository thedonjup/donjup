import TrackedLink from "@/components/analytics/TrackedLink";

interface LandingStat {
  label: string;
  value: string;
  hint: string;
}

interface SignalLandingHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  basisLabel: string;
  stats: LandingStat[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  eventScope: string;
  tone: "drop" | "rise" | "rate" | "neutral";
}

export default function SignalLandingHeader({
  eyebrow,
  title,
  description,
  basisLabel,
  stats,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  eventScope,
  tone,
}: SignalLandingHeaderProps) {
  const accentClass = {
    drop: "text-blue-600 dark:text-blue-300",
    rise: "text-red-600 dark:text-red-300",
    rate: "text-amber-600 dark:text-amber-300",
    neutral: "text-brand-700 dark:text-brand-300",
  }[tone];
  const primaryClass = {
    drop: "bg-blue-600 text-white hover:bg-blue-700",
    rise: "bg-red-600 text-white hover:bg-red-700",
    rate: "bg-amber-600 text-white hover:bg-amber-700",
    neutral: "bg-brand-600 text-white hover:bg-brand-700",
  }[tone];
  const dotClass = {
    drop: "bg-blue-500",
    rise: "bg-red-500",
    rate: "bg-amber-500",
    neutral: "bg-brand-500",
  }[tone];

  return (
    <section className="border-b t-border bg-[var(--color-surface-card)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border t-border bg-[var(--color-surface-page)] px-3 py-1 text-xs font-semibold t-text-secondary">
              <span className={`mr-2 h-2 w-2 rounded-full ${dotClass}`} />
              {eyebrow}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight t-text sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-base leading-7 t-text-secondary">
              {description}
            </p>
            <p className={`mt-3 text-sm font-bold ${accentClass}`}>{basisLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <TrackedLink
              href={primaryHref}
              ctaName={`${eventScope}_primary_cta_click`}
              className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-bold transition ${primaryClass}`}
            >
              {primaryLabel}
            </TrackedLink>
            <TrackedLink
              href={secondaryHref}
              ctaName={`${eventScope}_secondary_cta_click`}
              className="inline-flex min-h-11 items-center rounded-lg border t-border px-4 text-sm font-bold t-text-secondary transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {secondaryLabel}
            </TrackedLink>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border t-border bg-[var(--color-surface-page)] p-4"
            >
              <p className="text-[11px] font-semibold t-text-tertiary">{stat.label}</p>
              <p className="mt-1 text-xl font-black tabular-nums t-text">{stat.value}</p>
              <p className="mt-1 text-xs t-text-tertiary">{stat.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
