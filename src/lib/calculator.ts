/**
 * 대출 이자 계산 로직
 */

export interface LoanInput {
  principal: number; // 대출 원금 (원)
  rate: number; // 연 금리 (%)
  years: number; // 상환 기간 (년)
}

export interface MonthlySchedule {
  month: number;
  principal: number; // 원금 상환액
  interest: number; // 이자
  balance: number; // 잔금
}

export interface LoanResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  schedule: MonthlySchedule[];
}

/** 원리금균등상환 */
export function calcEqualPayment(input: LoanInput): LoanResult {
  const { principal, rate, years } = input;
  const monthlyRate = rate / 100 / 12;
  const totalMonths = years * 12;

  if (monthlyRate === 0) {
    const monthlyPayment = Math.round(principal / totalMonths);
    return {
      monthlyPayment,
      totalInterest: 0,
      totalPayment: principal,
      schedule: buildScheduleEqualPayment(principal, 0, totalMonths),
    };
  }

  const monthlyPayment = Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  const schedule = buildScheduleEqualPayment(
    principal,
    monthlyRate,
    totalMonths
  );
  const totalPayment = monthlyPayment * totalMonths;
  const totalInterest = totalPayment - principal;

  return { monthlyPayment, totalInterest, totalPayment, schedule };
}

function buildScheduleEqualPayment(
  principal: number,
  monthlyRate: number,
  totalMonths: number
): MonthlySchedule[] {
  const schedule: MonthlySchedule[] = [];
  let balance = principal;

  const monthlyPayment =
    monthlyRate === 0
      ? Math.round(principal / totalMonths)
      : Math.round(
          (principal *
            monthlyRate *
            Math.pow(1 + monthlyRate, totalMonths)) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1)
        );

  for (let m = 1; m <= Math.min(totalMonths, 360); m++) {
    const interest = Math.round(balance * monthlyRate);
    const principalPart = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPart);

    schedule.push({
      month: m,
      principal: principalPart,
      interest,
      balance,
    });
  }

  return schedule;
}

/** 원금균등상환 */
export function calcEqualPrincipal(input: LoanInput): LoanResult {
  const { principal, rate, years } = input;
  const monthlyRate = rate / 100 / 12;
  const totalMonths = years * 12;
  const monthlyPrincipal = Math.round(principal / totalMonths);

  const schedule: MonthlySchedule[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const interest = Math.round(balance * monthlyRate);
    totalInterest += interest;
    balance = Math.max(0, balance - monthlyPrincipal);

    schedule.push({
      month: m,
      principal: monthlyPrincipal,
      interest,
      balance,
    });
  }

  return {
    monthlyPayment: monthlyPrincipal + schedule[0].interest, // 첫 달 기준
    totalInterest,
    totalPayment: principal + totalInterest,
    schedule,
  };
}

/** 만기일시상환 */
export function calcBullet(input: LoanInput): LoanResult {
  const { principal, rate, years } = input;
  const monthlyRate = rate / 100 / 12;
  const totalMonths = years * 12;
  const monthlyInterest = Math.round(principal * monthlyRate);

  const schedule: MonthlySchedule[] = [];
  for (let m = 1; m <= totalMonths; m++) {
    const isLast = m === totalMonths;
    schedule.push({
      month: m,
      principal: isLast ? principal : 0,
      interest: monthlyInterest,
      balance: isLast ? 0 : principal,
    });
  }

  const totalInterest = monthlyInterest * totalMonths;
  return {
    monthlyPayment: monthlyInterest,
    totalInterest,
    totalPayment: principal + totalInterest,
    schedule,
  };
}
