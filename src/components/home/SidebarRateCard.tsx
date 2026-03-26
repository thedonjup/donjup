import Link from "next/link";
import { RATE_LABELS } from "@/lib/format";

interface Rate {
  id?: string | number;
  rate_type: string;
  rate_value: number;
  change_bp: number | null;
  base_date?: string;
}

interface SidebarRateCardProps {
  rates: Rate[];
}

export default function SidebarRateCard({ rates }: SidebarRateCardProps) {
  if (rates.length === 0) return null;

  return (
    <div className="rounded-2xl border t-border t-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold t-text">금리 현황</h2>
        <Link href="/rate" className="text-xs text-brand-600 hover:underline">
          자세히 &rarr;
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {rates.map((r) => (
          <div key={r.rate_type} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium t-text">
                {RATE_LABELS[r.rate_type] || r.rate_type}
              </p>
              <p className="text-[11px] t-text-tertiary">{r.base_date}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold tabular-nums t-text">
                {r.rate_value}%
              </p>
              {r.change_bp !== null && r.change_bp !== 0 && (
                <p
                  className={`text-[11px] font-semibold tabular-nums ${
                    r.change_bp > 0 ? "t-drop" : "t-rise"
                  }`}
                >
                  {r.change_bp > 0 ? "▲" : "▼"}{" "}
                  {Math.abs(r.change_bp)}bp
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
