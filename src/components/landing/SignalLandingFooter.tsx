import TrackedLink from "@/components/analytics/TrackedLink";

interface RelatedLink {
  href: string;
  title: string;
  description: string;
}

interface SignalLandingFooterProps {
  eventScope: string;
  methodTitle: string;
  methodItems: string[];
  relatedLinks: RelatedLink[];
}

export default function SignalLandingFooter({
  eventScope,
  methodTitle,
  methodItems,
  relatedLinks,
}: SignalLandingFooterProps) {
  return (
    <section className="mt-10 border-t t-border pt-8">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <h2 className="text-lg font-extrabold t-text">{methodTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 t-text-secondary">
            {methodItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-extrabold t-text">다음에 볼 신호</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {relatedLinks.map((link) => (
              <TrackedLink
                key={link.href}
                href={link.href}
                ctaName={`${eventScope}_related_link_click`}
                params={{ href: link.href }}
                className="rounded-lg border t-border bg-[var(--color-surface-card)] p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <p className="text-sm font-bold t-text">{link.title}</p>
                <p className="mt-1 text-xs leading-5 t-text-tertiary">{link.description}</p>
              </TrackedLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
