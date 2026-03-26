"use client";

export function ResultCard({
  title,
  description,
  monthlyPayment,
  totalInterest,
  highlight = false,
}: {
  title: string;
  description: string;
  monthlyPayment: number;
  totalInterest: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-brand-200 bg-brand-50/30"
          : "t-border bg-[var(--color-surface-card)]"
      }`}
    >
      <p className={`text-sm font-semibold ${highlight ? "text-brand-700" : "t-text-secondary"}`}>{title}</p>
      <p className="text-xs t-text-tertiary">{description}</p>
      <p className="mt-3 text-2xl font-extrabold tabular-nums t-text">
        {monthlyPayment.toLocaleString()}
        <span className="ml-0.5 text-sm font-normal t-text-tertiary">원/월</span>
      </p>
      <p className="mt-1 text-xs t-text-tertiary">
        총 이자: {totalInterest.toLocaleString()}원
      </p>
    </div>
  );
}
