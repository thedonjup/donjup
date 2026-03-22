"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface MiniLoanCalculatorProps {
  defaultPrice: number; // 만원 단위
}

export default function MiniLoanCalculator({ defaultPrice }: MiniLoanCalculatorProps) {
  const [loanAmount, setLoanAmount] = useState(defaultPrice);
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(30);

  const monthlyPayment = useMemo(() => {
    if (loanAmount <= 0 || rate <= 0 || years <= 0) return 0;
    const P = loanAmount * 10000; // 만원 → 원
    const r = rate / 100 / 12; // 월 이율
    const n = years * 12; // 총 개월수
    const M = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return Math.round(M);
  }, [loanAmount, rate, years]);

  function formatWon(won: number): string {
    if (won >= 100000000) {
      const eok = Math.floor(won / 100000000);
      const remainder = Math.round((won % 100000000) / 10000);
      return remainder > 0 ? `${eok}억 ${remainder.toLocaleString()}만원` : `${eok}억원`;
    }
    if (won >= 10000) {
      return `${Math.round(won / 10000).toLocaleString()}만원`;
    }
    return `${won.toLocaleString()}원`;
  }

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
    >
      <h2 className="mb-4 font-bold t-text">대출 이자 계산기</h2>

      <div className="space-y-3">
        {/* 대출금액 */}
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--color-text-tertiary)" }}>
            대출금액 (만원)
          </label>
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-elevated)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        {/* 금리 & 기간 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--color-text-tertiary)" }}>
              금리 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-elevated)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--color-text-tertiary)" }}>
              기간 (년)
            </label>
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-elevated)",
                color: "var(--color-text-primary)",
              }}
            >
              <option value={10}>10년</option>
              <option value={15}>15년</option>
              <option value={20}>20년</option>
              <option value={25}>25년</option>
              <option value={30}>30년</option>
              <option value={35}>35년</option>
              <option value={40}>40년</option>
            </select>
          </div>
        </div>
      </div>

      {/* 결과 */}
      <div className="mt-4 rounded-xl p-3" style={{ background: "var(--color-surface-elevated)" }}>
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          월 상환액 (원리금균등)
        </p>
        <p className="mt-1 text-lg font-extrabold tabular-nums text-brand-600">
          {monthlyPayment > 0 ? formatWon(monthlyPayment) : "-"}
        </p>
      </div>

      <Link
        href="/rate/calculator"
        className="mt-3 block text-center text-xs font-medium text-brand-600 hover:text-brand-700 transition"
      >
        상세 계산기 &rarr;
      </Link>
    </div>
  );
}
