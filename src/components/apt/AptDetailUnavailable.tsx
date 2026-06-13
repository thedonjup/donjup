import Link from "next/link";
import { detailPageUnavailableCopy } from "@/lib/detail-data-state";

interface AptDetailUnavailableProps {
  retryPath: string;
}

export default function AptDetailUnavailable({
  retryPath,
}: AptDetailUnavailableProps) {
  const copy = detailPageUnavailableCopy();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <section
        role="status"
        className="rounded-2xl border p-6"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-card)",
          color: "var(--color-text-secondary)",
        }}
      >
        <h1 className="text-xl font-extrabold" style={{ color: "var(--color-text-primary)" }}>
          {copy.title}
        </h1>
        <p className="mt-2 text-sm">{copy.description}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={retryPath}
            className="rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: "var(--color-brand-600)" }}
          >
            {copy.retryLabel}
          </Link>
          <Link
            href="/search"
            className="rounded-xl border px-4 py-2 text-sm font-bold"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            {copy.searchLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
