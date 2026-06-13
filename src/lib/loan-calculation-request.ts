import type { LoanInput } from "@/lib/calculator";

const MAX_PRINCIPAL_WON = 10_000_000_000;
const MAX_RATE_PERCENT = 30;
const MAX_YEARS = 50;

const REPAYMENT_TYPES = ["equal_payment", "equal_principal", "bullet"] as const;

export type RepaymentType = (typeof REPAYMENT_TYPES)[number];

export type ParsedLoanCalculationRequest =
  | { ok: true; input: LoanInput; type: RepaymentType | null }
  | { ok: false; error: string };

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseRepaymentType(value: unknown): RepaymentType | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return REPAYMENT_TYPES.includes(trimmed as RepaymentType)
    ? (trimmed as RepaymentType)
    : undefined;
}

export function parseLoanCalculationRequest(
  body: unknown
): ParsedLoanCalculationRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "principal, rate, years는 필수입니다." };
  }

  const record = body as Record<string, unknown>;
  const principal = toFiniteNumber(record.principal);
  const rate = toFiniteNumber(record.rate);
  const years = toFiniteNumber(record.years);

  if (principal === null || rate === null || years === null) {
    return { ok: false, error: "principal, rate, years는 필수입니다." };
  }

  if (!Number.isInteger(principal) || principal < 1 || principal > MAX_PRINCIPAL_WON) {
    return { ok: false, error: "대출 원금은 1원~100억원 사이여야 합니다." };
  }

  if (rate < 0 || rate > MAX_RATE_PERCENT) {
    return { ok: false, error: "금리는 0~30% 사이여야 합니다." };
  }

  if (!Number.isInteger(years) || years < 1 || years > MAX_YEARS) {
    return { ok: false, error: "상환 기간은 1~50년 사이여야 합니다." };
  }

  const type = parseRepaymentType(record.type);
  if (type === undefined) {
    return { ok: false, error: "상환 방식이 올바르지 않습니다." };
  }

  return { ok: true, input: { principal, rate, years }, type };
}
