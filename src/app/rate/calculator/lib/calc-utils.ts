/* ─── Types ─── */

export interface CalcResult {
  input: { principal: number; rate: number; years: number };
  comparison: {
    equal_payment: { monthlyPayment: number; totalInterest: number; totalPayment: number };
    equal_principal: { monthlyPayment: number; totalInterest: number; totalPayment: number };
    bullet: { monthlyPayment: number; totalInterest: number; totalPayment: number };
  };
  schedule_preview: Array<{
    month: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

export interface DsrResult {
  dsr: number;
  newAnnualRepayment: number;
  totalAnnualRepayment: number;
  isWithinLimit: boolean;
  maxLoanAmount: number; // 만원 단위
  regulationType: "bank" | "nonbank";
}

export interface JeonseResult {
  monthlyRent: number; // 원
  newDeposit: number; // 만원
  adjustedMonthly: number; // 원 (보증금 차액 기반 월세)
}

export type TabId = "loan" | "dsr" | "jeonse";

export const TABS: { id: TabId; label: string; description: string }[] = [
  { id: "loan", label: "대출 이자", description: "상환 방식별 비교" },
  { id: "dsr", label: "DSR", description: "대출 가능 여부" },
  { id: "jeonse", label: "전세-월세 전환", description: "전환 계산" },
];

/* ─── Shared helpers ─── */

export function calcEqualPaymentMonthly(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

export function calcMaxPrincipal(monthlyPayment: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return monthlyPayment * n;
  return monthlyPayment * (Math.pow(1 + monthlyRate, n) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, n));
}

export function numericInput(value: string, setter: (v: string) => void) {
  return {
    type: "text" as const,
    inputMode: "numeric" as const,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      setter(raw ? parseInt(raw).toLocaleString() : "");
    },
  };
}

export function parseManwon(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

export const inputClass =
  "mt-1.5 block w-full rounded-xl border px-4 py-3 text-lg font-bold tabular-nums t-text placeholder:opacity-40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" +
  " " + "border-[var(--color-border)] bg-[var(--color-surface-elevated)] focus:bg-[var(--color-surface-card)]";

export const selectClass =
  "mt-1.5 block w-full rounded-xl border px-4 py-3 text-lg font-bold t-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" +
  " " + "border-[var(--color-border)] bg-[var(--color-surface-elevated)] focus:bg-[var(--color-surface-card)]";
