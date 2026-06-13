import Link from "next/link";
import { RATE_LABELS, RATE_ORDER } from "@/lib/format";

interface Rate {
  id?: string | number;
  rate_type: string;
  rate_value: number | string;
  change_bp: number | null;
}

interface RateBarProps {
  rates: Rate[];
}

export default function RateBar({ rates }: RateBarProps) {
  if (rates.length === 0) return null;

  // 1. 핵심 시장 금리 추출 (기준금리, CD, 국고채 등)
  const coreRates = rates.filter(r => RATE_ORDER.includes(r.rate_type));

  // 2. 은행별 금리 평균 계산 (BANK_ 로 시작하는 항목들 중 유효한 값만)
  const bankRates = rates.filter(r => r.rate_type.startsWith("BANK_") && Number(r.rate_value) > 0);
  let bankAverage: Rate | null = null;

  if (bankRates.length > 0) {
    const sum = bankRates.reduce((acc, curr) => acc + Number(coreToFloat(curr.rate_value)), 0);
    const avg = sum / bankRates.length;
    bankAverage = {
      rate_type: "BANK_AVERAGE",
      rate_value: avg.toFixed(2),
      change_bp: null
    };
  }

  // 3. 최종 표시할 리스트 구성 (순서 보장 및 개수 제한)
  const displayRates = [...coreRates];
  if (bankAverage) displayRates.push(bankAverage);

  // 정렬: RATE_ORDER 순서 + 평균 금리 마지막
  const finalRates = displayRates.sort((a, b) => {
    const idxA = RATE_ORDER.indexOf(a.rate_type);
    const idxB = RATE_ORDER.indexOf(b.rate_type);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  }).slice(0, 4); // 최대 4개로 제한

  return (
    <section className="border-b t-border t-card overflow-hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-0">
        <div className="flex flex-1 items-center overflow-x-auto no-scrollbar">
          {finalRates.map((r) => (
            <div
              key={r.rate_type}
              className="flex min-w-[140px] flex-1 items-center justify-between border-r last:border-r-0 t-border px-4 py-3 sm:min-w-0"
            >
              <span className="truncate text-[11px] font-medium t-text-secondary sm:text-xs">
                {RATE_LABELS[r.rate_type] || r.rate_type}
              </span>
              <div className="ml-2 flex items-center gap-1.5">
                <span className="text-xs font-bold tabular-nums t-text sm:text-sm">
                  {r.rate_value}%
                </span>
                {r.change_bp !== null && r.change_bp !== 0 && (
                  <span
                    className={`text-[10px] font-semibold tabular-nums ${
                      r.change_bp > 0 ? "t-drop" : "t-rise"
                    }`}
                  >
                    {r.change_bp > 0 ? "▲" : "▼"}
                    {Math.abs(r.change_bp)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/rate"
          className="flex-shrink-0 px-4 py-3 text-xs font-semibold text-brand-600 hover:underline whitespace-nowrap border-l t-border"
        >
          전체보기 &rarr;
        </Link>
      </div>
    </section>
  );
}

function coreToFloat(v: number | string): number {
  if (typeof v === "number") return v;
  return parseFloat(v) || 0;
}
