import Link from "next/link";
import { RATE_LABELS } from "@/lib/format";

interface Rate {
  id?: string | number;
  rate_type: string;
  rate_value: number;
  change_bp: number | null;
}

interface RateBarProps {
  rates: Rate[];
}

export default function RateBar({ rates }: RateBarProps) {
  if (rates.length === 0) return null;

  return (
    <section className="border-b t-border t-card">
      <div className="mx-auto flex max-w-6xl items-center gap-0 overflow-x-auto">
        {rates.map((r) => (
          <div
            key={r.rate_type}
            className="flex min-w-0 flex-1 items-center justify-between border-r last:border-r-0 t-border px-4 py-3"
          >
            <span className="truncate text-xs font-medium t-text-secondary">
              {RATE_LABELS[r.rate_type] || r.rate_type}
            </span>
            <div className="ml-2 flex items-center gap-1.5">
              <span className="text-sm font-bold tabular-nums t-text">
                {r.rate_value}%
              </span>
              {r.change_bp !== null && r.change_bp !== 0 && (
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    r.change_bp > 0 ? "t-drop" : "t-rise"
                  }`}
                >
                  {r.change_bp > 0 ? "▲" : "▼"}
                  {Math.abs(r.change_bp)}bp
                </span>
              )}
            </div>
          </div>
        ))}
        <Link
          href="/rate"
          className="flex-shrink-0 px-4 py-3 text-xs font-semibold text-brand-600 hover:underline"
        >
          자세히 &rarr;
        </Link>
      </div>
    </section>
  );
}
