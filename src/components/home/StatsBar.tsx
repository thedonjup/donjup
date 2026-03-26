interface StatsBarProps {
  totalTxns: number;
  totalComplexes: number;
  dropCount: number;
  highCount: number;
}

function StatBarItem({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix: string;
  accent: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center border-r last:border-r-0 t-border px-4 py-4 sm:px-6">
      <p className="text-[11px] font-medium t-text-tertiary">{label}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums ${accent}`}>
        {value.toLocaleString()}
        <span className="ml-0.5 text-xs font-medium t-text-tertiary">
          {suffix}
        </span>
      </p>
    </div>
  );
}

export default function StatsBar({ totalTxns, totalComplexes, dropCount, highCount }: StatsBarProps) {
  return (
    <section className="border-b t-border t-card">
      <div className="mx-auto flex max-w-6xl items-stretch gap-0 overflow-x-auto">
        <StatBarItem label="오늘 거래건수" value={totalTxns} suffix="건" accent="t-drop" />
        <StatBarItem label="전국 단지수" value={totalComplexes} suffix="개" accent="text-brand-600" />
        <StatBarItem label="폭락 건수" value={dropCount} suffix="건" accent="t-drop" />
        <StatBarItem label="신고가 건수" value={highCount} suffix="건" accent="t-rise" />
      </div>
    </section>
  );
}
