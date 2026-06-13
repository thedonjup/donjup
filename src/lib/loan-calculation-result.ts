import {
  calcBullet,
  calcEqualPayment,
  calcEqualPrincipal,
  type LoanInput,
  type LoanResult,
} from "@/lib/calculator";
import type { RepaymentType } from "@/lib/loan-calculation-request";

type LoanSummary = Pick<LoanResult, "monthlyPayment" | "totalInterest" | "totalPayment">;

export type LoanCalculationResponse =
  | LoanResult
  | {
      input: LoanInput;
      comparison: Record<RepaymentType, LoanSummary>;
      schedule_preview: LoanResult["schedule"];
    };

export function calculateLoanResponse(
  input: LoanInput,
  type: RepaymentType | null
): LoanCalculationResponse {
  const results: Record<RepaymentType, LoanResult> = {
    equal_payment: calcEqualPayment(input),
    equal_principal: calcEqualPrincipal(input),
    bullet: calcBullet(input),
  };

  if (type) {
    return results[type];
  }

  return {
    input,
    comparison: {
      equal_payment: toLoanSummary(results.equal_payment),
      equal_principal: toLoanSummary(results.equal_principal),
      bullet: toLoanSummary(results.bullet),
    },
    schedule_preview: results.equal_payment.schedule.slice(0, 12),
  };
}

function toLoanSummary(result: LoanResult): LoanSummary {
  return {
    monthlyPayment: result.monthlyPayment,
    totalInterest: result.totalInterest,
    totalPayment: result.totalPayment,
  };
}
