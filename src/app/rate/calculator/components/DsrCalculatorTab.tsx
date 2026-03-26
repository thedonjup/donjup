"use client";

import { useState } from "react";
import { formatKrw } from "@/lib/format";
import { trackCalculate } from "@/lib/analytics/events";
import {
  DsrResult,
  calcEqualPaymentMonthly,
  calcMaxPrincipal,
  numericInput,
  parseManwon,
  inputClass,
  selectClass,
} from "../lib/calc-utils";
import { DsrResultDisplay } from "./DsrResult";

export function DsrCalculatorTab() {
  const [annualIncome, setAnnualIncome] = useState("");
  const [existingRepayment, setExistingRepayment] = useState("");
  const [newLoanAmount, setNewLoanAmount] = useState("");
  const [loanRate, setLoanRate] = useState("3.5");
  const [loanYears, setLoanYears] = useState("30");
  const [regulationType, setRegulationType] = useState<"bank" | "nonbank">("bank");
  const [dsrResult, setDsrResult] = useState<DsrResult | null>(null);

  const dsrLimit = regulationType === "bank" ? 40 : 50;

  const handleCalculate = () => {
    const income = parseManwon(annualIncome) * 10000;
    const existing = parseManwon(existingRepayment) * 10000;
    const newLoan = parseManwon(newLoanAmount) * 10000;
    const rate = parseFloat(loanRate);
    const years = parseInt(loanYears);

    if (!income || !newLoan || !rate || !years) return;

    const monthlyNew = calcEqualPaymentMonthly(newLoan, rate, years);
    const annualNew = monthlyNew * 12;
    const totalAnnual = existing + annualNew;
    const dsr = (totalAnnual / income) * 100;

    const maxAnnualNew = income * (dsrLimit / 100) - existing;
    let maxLoan = 0;
    if (maxAnnualNew > 0) {
      const maxMonthlyNew = maxAnnualNew / 12;
      maxLoan = Math.floor(calcMaxPrincipal(maxMonthlyNew, rate, years) / 10000);
    }

    setDsrResult({
      dsr: Math.round(dsr * 100) / 100,
      newAnnualRepayment: Math.round(annualNew),
      totalAnnualRepayment: Math.round(totalAnnual),
      isWithinLimit: dsr <= dsrLimit,
      maxLoanAmount: maxLoan,
      regulationType,
    });
    trackCalculate("dsr", { dsr: Math.round(dsr * 100) / 100, income: parseManwon(annualIncome) });
  };

  return (
    <>
      <div className="mt-6 rounded-2xl border t-border bg-[var(--color-surface-card)] p-6">
        <div className="mb-5">
          <p className="text-sm font-medium t-text mb-1">DSR (총부채원리금상환비율)</p>
          <p className="text-xs t-text-tertiary">
            연소득 대비 모든 대출의 연간 원리금 상환 비율을 계산합니다.
          </p>
        </div>

        {/* Regulation Type Toggle */}
        <div className="mb-5">
          <p className="text-sm font-medium t-text mb-2">규제 기준</p>
          <div className="flex gap-2">
            {([
              { id: "bank" as const, label: "은행권 (40%)" },
              { id: "nonbank" as const, label: "비은행권 (50%)" },
            ]).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRegulationType(opt.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  regulationType === opt.id
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-surface-200 t-text-secondary hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium t-text">연소득 (만원)</label>
            <input
              {...numericInput(annualIncome, setAnnualIncome)}
              placeholder="5,000"
              className={inputClass}
            />
            {annualIncome && (
              <p className="mt-1 text-xs t-text-tertiary">
                {formatKrw(parseManwon(annualIncome) * 10000)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium t-text">
              기존 대출 연간 원리금 상환액 (만원)
            </label>
            <input
              {...numericInput(existingRepayment, setExistingRepayment)}
              placeholder="0"
              className={inputClass}
            />
            {existingRepayment && (
              <p className="mt-1 text-xs t-text-tertiary">
                {formatKrw(parseManwon(existingRepayment) * 10000)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium t-text mb-2">빠른 금액 선택 (신규 대출)</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "1억", value: 10000 },
              { label: "2억", value: 20000 },
              { label: "3억", value: 30000 },
              { label: "5억", value: 50000 },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setNewLoanAmount(preset.value.toLocaleString())}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  newLoanAmount === preset.value.toLocaleString()
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-surface-200 t-text-secondary hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium t-text">
              신규 대출 희망 금액 (만원)
            </label>
            <input
              {...numericInput(newLoanAmount, setNewLoanAmount)}
              placeholder="30,000"
              className={inputClass}
            />
            {newLoanAmount && (
              <p className="mt-1 text-xs t-text-tertiary">
                {formatKrw(parseManwon(newLoanAmount) * 10000)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium t-text">대출 금리 (%)</label>
            <input
              type="number"
              step="0.01"
              value={loanRate}
              onChange={(e) => setLoanRate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium t-text">대출 기간</label>
            <select
              value={loanYears}
              onChange={(e) => setLoanYears(e.target.value)}
              className={selectClass}
            >
              {[10, 15, 20, 25, 30, 35, 40].map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={!annualIncome || !newLoanAmount}
          className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 text-lg font-bold text-white transition hover:bg-brand-700 disabled:opacity-40"
        >
          DSR 계산하기
        </button>
      </div>

      {dsrResult && <DsrResultDisplay dsrResult={dsrResult} dsrLimit={dsrLimit} />}
    </>
  );
}
