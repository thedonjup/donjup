"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatKrw, formatPrice } from "@/lib/format";
import CoupangBanner from "@/components/CoupangBanner";

/* ─── Types ─── */

interface CalcResult {
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

type TabId = "loan" | "dsr" | "jeonse";

const TABS: { id: TabId; label: string; description: string }[] = [
  { id: "loan", label: "대출 이자", description: "상환 방식별 비교" },
  { id: "dsr", label: "DSR", description: "대출 가능 여부" },
  { id: "jeonse", label: "전세-월세 전환", description: "전환 계산" },
];

/* ─── Shared helpers ─── */

function calcEqualPaymentMonthly(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

/** Reverse: given monthly payment, rate, years → principal */
function calcMaxPrincipal(monthlyPayment: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return monthlyPayment * n;
  return monthlyPayment * (Math.pow(1 + monthlyRate, n) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, n));
}

function numericInput(value: string, setter: (v: string) => void) {
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

function parseManwon(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

const inputClass =
  "mt-1.5 block w-full rounded-xl border px-4 py-3 text-lg font-bold tabular-nums t-text placeholder:opacity-40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" +
  " " + "border-[var(--color-border)] bg-[var(--color-surface-elevated)] focus:bg-[var(--color-surface-card)]";

const selectClass =
  "mt-1.5 block w-full rounded-xl border px-4 py-3 text-lg font-bold t-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" +
  " " + "border-[var(--color-border)] bg-[var(--color-surface-elevated)] focus:bg-[var(--color-surface-card)]";

/* ─── Main Page ─── */

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8"><p className="t-text-tertiary">로딩 중...</p></div>}>
      <CalculatorContent />
    </Suspense>
  );
}

function CalculatorContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "loan";
  const [activeTab, setActiveTab] = useState<TabId>(
    ["loan", "dsr", "jeonse"].includes(initialTab) ? initialTab : "loan"
  );

  useEffect(() => {
    const tab = searchParams.get("tab") as TabId;
    if (tab && ["loan", "dsr", "jeonse"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
        <h1 className="text-2xl font-extrabold t-text">대출/부동산 계산기</h1>
      </div>
      <p className="text-sm t-text-secondary">
        대출 이자, DSR, 전세-월세 전환을 한곳에서 계산하세요.
      </p>

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-1 rounded-xl bg-surface-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[var(--color-surface-card)] text-brand-700 shadow-sm"
                : "t-text-secondary hover:t-text"
            }`}
          >
            <span className="block">{tab.label}</span>
            <span className="block text-[11px] font-normal opacity-70">{tab.description}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "loan" && <LoanCalculatorTab />}
      {activeTab === "dsr" && <DsrCalculatorTab />}
      {activeTab === "jeonse" && <JeonseConversionTab />}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab 1: 대출 이자 계산기 (기존)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function LoanCalculatorTab() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("3.5");
  const [years, setYears] = useState("30");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateOffset, setRateOffset] = useState(0);
  const [bankMinRate, setBankMinRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/bank-rates")
      .then((res) => res.json())
      .then((data) => {
        if (data.minRate) setBankMinRate(data.minRate);
      })
      .catch(() => {});
  }, []);

  const handleCalculate = async () => {
    const principalNum = parseManwon(principal);
    if (!principalNum || !rate || !years) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rate/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: principalNum * 10000,
          rate: parseFloat(rate),
          years: parseInt(years),
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Input Form */}
      <div className="mt-6 rounded-2xl border t-border bg-[var(--color-surface-card)] p-6">
        {/* Quick Amount Buttons */}
        <div className="mb-5">
          <p className="text-sm font-medium t-text mb-2">빠른 금액 선택</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "1억", value: 10000 },
              { label: "2억", value: 20000 },
              { label: "3억", value: 30000 },
              { label: "4억", value: 40000 },
              { label: "5억", value: 50000 },
              { label: "7억", value: 70000 },
              { label: "10억", value: 100000 },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setPrincipal(preset.value.toLocaleString())}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  principal === preset.value.toLocaleString()
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-surface-200 t-text-secondary hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium t-text">
              대출 원금 (만원)
            </label>
            <input
              {...numericInput(principal, setPrincipal)}
              placeholder="30,000"
              className={inputClass}
            />
            {principal && (
              <p className="mt-1 text-xs t-text-tertiary">
                {formatKrw(parseManwon(principal) * 10000)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium t-text">
              연 금리 (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={inputClass}
            />
            {bankMinRate !== null && (
              <p className="mt-1 text-xs text-brand-600">
                현재 은행 최저금리: {bankMinRate.toFixed(2)}%
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium t-text">
              상환 기간
            </label>
            <select
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className={selectClass}
            >
              {[10, 15, 20, 25, 30, 35, 40].map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleCalculate}
          disabled={loading || !principal}
          className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 text-lg font-bold text-white transition hover:bg-brand-700 disabled:opacity-40"
        >
          {loading ? "계산 중..." : "계산하기"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <ResultCard
              title="원리금균등"
              description="매월 같은 금액 상환"
              monthlyPayment={result.comparison.equal_payment.monthlyPayment}
              totalInterest={result.comparison.equal_payment.totalInterest}
              highlight
            />
            <ResultCard
              title="원금균등"
              description="매월 줄어드는 상환액"
              monthlyPayment={result.comparison.equal_principal.monthlyPayment}
              totalInterest={result.comparison.equal_principal.totalInterest}
            />
            <ResultCard
              title="만기일시"
              description="만기에 원금 일괄 상환"
              monthlyPayment={result.comparison.bullet.monthlyPayment}
              totalInterest={result.comparison.bullet.totalInterest}
            />
          </div>

          {/* Rate Scenario Slider */}
          <RateScenarioSlider
            principal={result.input.principal}
            rate={result.input.rate}
            years={result.input.years}
            currentMonthly={result.comparison.equal_payment.monthlyPayment}
            rateOffset={rateOffset}
            onOffsetChange={setRateOffset}
          />

          {/* CPA Funnel - savings info */}
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-6 text-center">
              <p className="text-xl font-extrabold text-brand-900">
                월 {result.comparison.equal_payment.monthlyPayment.toLocaleString()}원, 더 줄일 수 있어요
              </p>
              <p className="mt-1 text-sm text-brand-600">
                금리 0.5%p만 낮춰도 월{" "}
                {Math.round(
                  result.comparison.equal_payment.monthlyPayment -
                    result.comparison.equal_payment.monthlyPayment * 0.92
                ).toLocaleString()}
                원 절약
              </p>
            </div>
            <p className="text-center text-xs t-text-tertiary">
              금융사별 금리를 비교해 보세요. 주거래 은행 외에도 더 낮은 금리를 제공하는 곳이 있을 수 있습니다.
            </p>
          </div>

          {/* Coupang Partners */}
          <CoupangBanner
            category="book"
            title="부동산 투자 필독서"
            limit={3}
            className="mt-6"
          />

          {/* Schedule Preview */}
          {result.schedule_preview && result.schedule_preview.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-bold t-text">
                월별 상환 스케줄 (원리금균등, 12개월)
              </h2>
              <div className="overflow-x-auto rounded-2xl border t-border bg-[var(--color-surface-card)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-surface-50 text-left text-xs t-text-secondary">
                      <th className="px-4 py-3">회차</th>
                      <th className="px-4 py-3 text-right">원금</th>
                      <th className="px-4 py-3 text-right">이자</th>
                      <th className="px-4 py-3 text-right">잔금</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule_preview.map((row) => (
                      <tr key={row.month} className="border-b border-surface-100 last:border-0">
                        <td className="px-4 py-2.5 t-text">{row.month}개월</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                          {row.principal.toLocaleString()}원
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-drop">
                          {row.interest.toLocaleString()}원
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums t-text-secondary">
                          {row.balance.toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab 2: DSR 계산기
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface DsrResult {
  dsr: number;
  newAnnualRepayment: number;
  totalAnnualRepayment: number;
  isWithinLimit: boolean;
  maxLoanAmount: number; // 만원 단위
  regulationType: "bank" | "nonbank";
}

function DsrCalculatorTab() {
  const [annualIncome, setAnnualIncome] = useState("");
  const [existingRepayment, setExistingRepayment] = useState("");
  const [newLoanAmount, setNewLoanAmount] = useState("");
  const [loanRate, setLoanRate] = useState("3.5");
  const [loanYears, setLoanYears] = useState("30");
  const [regulationType, setRegulationType] = useState<"bank" | "nonbank">("bank");
  const [dsrResult, setDsrResult] = useState<DsrResult | null>(null);

  const dsrLimit = regulationType === "bank" ? 40 : 50;

  const handleCalculate = () => {
    const income = parseManwon(annualIncome) * 10000; // 원 단위
    const existing = parseManwon(existingRepayment) * 10000;
    const newLoan = parseManwon(newLoanAmount) * 10000;
    const rate = parseFloat(loanRate);
    const years = parseInt(loanYears);

    if (!income || !newLoan || !rate || !years) return;

    // 신규 대출 연간 원리금 상환액
    const monthlyNew = calcEqualPaymentMonthly(newLoan, rate, years);
    const annualNew = monthlyNew * 12;

    // 총 연간 원리금 상환액
    const totalAnnual = existing + annualNew;

    // DSR
    const dsr = (totalAnnual / income) * 100;

    // 최대 대출 가능액 역산
    const maxAnnualNew = income * (dsrLimit / 100) - existing;
    let maxLoan = 0;
    if (maxAnnualNew > 0) {
      const maxMonthlyNew = maxAnnualNew / 12;
      maxLoan = Math.floor(calcMaxPrincipal(maxMonthlyNew, rate, years) / 10000); // 만원
    }

    setDsrResult({
      dsr: Math.round(dsr * 100) / 100,
      newAnnualRepayment: Math.round(annualNew),
      totalAnnualRepayment: Math.round(totalAnnual),
      isWithinLimit: dsr <= dsrLimit,
      maxLoanAmount: maxLoan,
      regulationType,
    });
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
            <label className="block text-sm font-medium t-text">
              연소득 (만원)
            </label>
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
            <label className="block text-sm font-medium t-text">
              대출 금리 (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={loanRate}
              onChange={(e) => setLoanRate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium t-text">
              대출 기간
            </label>
            <select
              value={loanYears}
              onChange={(e) => setLoanYears(e.target.value)}
              className={selectClass}
            >
              {[10, 15, 20, 25, 30, 35, 40].map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
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

      {/* DSR Result */}
      {dsrResult && (
        <div className="mt-6 space-y-4">
          {/* Main DSR Display */}
          <div className="rounded-2xl border t-border bg-[var(--color-surface-card)] p-6">
            <div className="text-center">
              <p className="text-sm t-text-secondary">나의 DSR</p>
              <p
                className={`mt-1 text-4xl font-extrabold tabular-nums ${
                  dsrResult.isWithinLimit ? "text-brand-700" : "text-drop"
                }`}
              >
                {dsrResult.dsr.toFixed(1)}%
              </p>
            </div>

            {/* DSR Gauge Bar */}
            <div className="mt-5">
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-surface-100">
                {/* DSR fill */}
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                    dsrResult.isWithinLimit
                      ? "bg-gradient-to-r from-brand-400 to-brand-600"
                      : "bg-gradient-to-r from-orange-400 to-red-500"
                  }`}
                  style={{ width: `${Math.min(dsrResult.dsr, 100)}%` }}
                />
                {/* Regulation line */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-dark-900"
                  style={{ left: `${dsrLimit}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs t-text-tertiary">
                <span>0%</span>
                <span
                  className="font-semibold t-text"
                  style={{ marginLeft: `${dsrLimit - 10}%` }}
                >
                  {dsrLimit}% 규제선
                </span>
                <span>100%</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-5 text-center">
              {dsrResult.isWithinLimit ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-5 py-2.5">
                  <span className="text-sm font-bold text-brand-700">
                    대출 가능 범위 내입니다
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-5 py-2.5">
                  <span className="text-sm font-bold text-red-600">
                    DSR {dsrLimit}% 초과 - 대출 한도 제한
                  </span>
                </div>
              )}
              <p className="mt-2 text-xs t-text-tertiary">
                {dsrResult.regulationType === "bank" ? "은행권" : "비은행권"} DSR {dsrLimit}% 규제 기준
              </p>
            </div>
          </div>

          {/* Detail Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border t-border bg-[var(--color-surface-card)] p-5">
              <p className="text-sm t-text-secondary">신규 대출 연간 상환액</p>
              <p className="mt-2 text-xl font-extrabold tabular-nums t-text">
                {Math.round(dsrResult.newAnnualRepayment).toLocaleString()}
                <span className="ml-0.5 text-sm font-normal t-text-tertiary">원/년</span>
              </p>
              <p className="mt-1 text-xs t-text-tertiary">
                월 {Math.round(dsrResult.newAnnualRepayment / 12).toLocaleString()}원
              </p>
            </div>
            <div className="rounded-2xl border t-border bg-[var(--color-surface-card)] p-5">
              <p className="text-sm t-text-secondary">총 연간 원리금 상환액</p>
              <p className="mt-2 text-xl font-extrabold tabular-nums t-text">
                {Math.round(dsrResult.totalAnnualRepayment).toLocaleString()}
                <span className="ml-0.5 text-sm font-normal t-text-tertiary">원/년</span>
              </p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50/30 p-5">
              <p className="text-sm font-semibold text-brand-700">최대 대출 가능액 (추정)</p>
              <p className="mt-2 text-xl font-extrabold tabular-nums t-text">
                {dsrResult.maxLoanAmount > 0
                  ? formatPrice(dsrResult.maxLoanAmount)
                  : "불가"}
              </p>
              <p className="mt-1 text-xs t-text-tertiary">
                DSR {dsrLimit}% 기준, 원리금균등 상환
              </p>
            </div>
          </div>

          {/* CPA Banner */}
          <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-6 text-center">
            {dsrResult.isWithinLimit ? (
              <>
                <p className="text-lg font-extrabold text-brand-900">
                  대출 가능! 최저금리를 찾아보세요
                </p>
                <p className="mt-1 text-sm text-brand-600">
                  금융사별 금리를 비교하면 더 유리한 조건을 찾을 수 있습니다
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-extrabold t-text">
                  DSR 초과 시에도 방법이 있을 수 있어요
                </p>
                <p className="mt-1 text-sm t-text-secondary">
                  상환 기간 조정, 기존 대출 상환 등으로 DSR을 낮출 수 있습니다
                </p>
              </>
            )}
          </div>

          <CoupangBanner
            category="book"
            title="부동산 대출 가이드"
            limit={3}
            className="mt-2"
          />
        </div>
      )}
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab 3: 전세-월세 전환 계산기
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface JeonseResult {
  monthlyRent: number; // 원
  newDeposit: number; // 만원
  adjustedMonthly: number; // 원 (보증금 차액 기반 월세)
}

function JeonseConversionTab() {
  const [jeonseDeposit, setJeonseDeposit] = useState("");
  const [conversionRate, setConversionRate] = useState("4.5");
  const [newDeposit, setNewDeposit] = useState("");
  const [result, setResult] = useState<JeonseResult | null>(null);

  const handleCalculate = () => {
    const deposit = parseManwon(jeonseDeposit);
    const rate = parseFloat(conversionRate);
    if (!deposit || !rate) return;

    // 전세 → 순수 월세 환산
    const fullMonthly = Math.round((deposit * 10000 * rate) / 100 / 12);

    // 보증금 일부 유지 시 월세
    const partialDeposit = parseManwon(newDeposit);
    const diff = deposit - partialDeposit;
    const adjustedMonthly = diff > 0 ? Math.round((diff * 10000 * rate) / 100 / 12) : 0;

    setResult({
      monthlyRent: fullMonthly,
      newDeposit: partialDeposit,
      adjustedMonthly,
    });
  };

  return (
    <>
      <div className="mt-6 rounded-2xl border t-border bg-[var(--color-surface-card)] p-6">
        <div className="mb-5">
          <p className="text-sm font-medium t-text mb-1">전세-월세 전환 계산기</p>
          <p className="text-xs t-text-tertiary">
            전세 보증금을 월세로 전환했을 때의 월 임대료를 계산합니다.
          </p>
        </div>

        {/* Quick Amount Buttons */}
        <div className="mb-5">
          <p className="text-sm font-medium t-text mb-2">빠른 전세금 선택</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "1억", value: 10000 },
              { label: "2억", value: 20000 },
              { label: "3억", value: 30000 },
              { label: "4억", value: 40000 },
              { label: "5억", value: 50000 },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setJeonseDeposit(preset.value.toLocaleString())}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  jeonseDeposit === preset.value.toLocaleString()
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-surface-200 t-text-secondary hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium t-text">
              전세 보증금 (만원)
            </label>
            <input
              {...numericInput(jeonseDeposit, setJeonseDeposit)}
              placeholder="30,000"
              className={inputClass}
            />
            {jeonseDeposit && (
              <p className="mt-1 text-xs t-text-tertiary">
                {formatKrw(parseManwon(jeonseDeposit) * 10000)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium t-text">
              전환율 (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={conversionRate}
              onChange={(e) => setConversionRate(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs t-text-tertiary">
              한국은행 기준금리 기반 (통상 2.5~5.5%)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium t-text">
              월세 전환 시 보증금 (만원)
            </label>
            <input
              {...numericInput(newDeposit, setNewDeposit)}
              placeholder="10,000"
              className={inputClass}
            />
            {newDeposit && (
              <p className="mt-1 text-xs t-text-tertiary">
                {formatKrw(parseManwon(newDeposit) * 10000)}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={!jeonseDeposit}
          className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 text-lg font-bold text-white transition hover:bg-brand-700 disabled:opacity-40"
        >
          전환 계산하기
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Full Conversion */}
          <div className="rounded-2xl border t-border bg-[var(--color-surface-card)] p-6">
            <p className="text-sm font-semibold t-text-secondary">순수 월세 전환 시</p>
            <p className="mt-1 text-xs t-text-tertiary">보증금 없이 전액 월세로 전환한 경우</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="rounded-xl bg-surface-50 px-4 py-3 text-center">
                <p className="text-[11px] t-text-secondary">전세 보증금</p>
                <p className="mt-1 text-lg font-bold tabular-nums t-text">
                  {formatPrice(parseManwon(jeonseDeposit))}
                </p>
              </div>
              <span className="text-xl t-text-tertiary">&rarr;</span>
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-center">
                <p className="text-[11px] text-brand-600">환산 월세</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-brand-700">
                  월 {Math.round(result.monthlyRent).toLocaleString()}원
                </p>
              </div>
            </div>
          </div>

          {/* Partial Conversion */}
          {result.newDeposit > 0 && (
            <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-6">
              <p className="text-sm font-semibold text-brand-700">보증금 일부 유지 시</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-xl bg-[var(--color-surface-card)] px-4 py-3 text-center shadow-sm">
                  <p className="text-[11px] t-text-secondary">전세</p>
                  <p className="mt-1 text-lg font-bold tabular-nums t-text">
                    {formatPrice(parseManwon(jeonseDeposit))}
                  </p>
                </div>
                <span className="text-xl t-text-tertiary">&rarr;</span>
                <div className="rounded-xl bg-[var(--color-surface-card)] px-4 py-3 text-center shadow-sm">
                  <p className="text-[11px] t-text-secondary">보증금</p>
                  <p className="mt-1 text-lg font-bold tabular-nums t-text">
                    {formatPrice(result.newDeposit)}
                  </p>
                </div>
                <span className="text-xl t-text-tertiary">+</span>
                <div className="rounded-xl bg-brand-100 px-4 py-3 text-center">
                  <p className="text-[11px] text-brand-600">월세</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-brand-700">
                    월 {result.adjustedMonthly.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reference Table */}
          <div className="rounded-2xl border t-border bg-[var(--color-surface-card)] p-6">
            <h3 className="text-sm font-bold t-text mb-3">
              보증금별 월세 환산 참고표
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface-50 text-left text-xs t-text-secondary">
                    <th className="px-4 py-2.5">보증금</th>
                    <th className="px-4 py-2.5 text-right">환산 월세</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const deposit = parseManwon(jeonseDeposit);
                    const rate = parseFloat(conversionRate);
                    const steps = [0, 5000, 10000, 15000, 20000].filter(
                      (d) => d < deposit
                    );
                    return steps.map((dep) => {
                      const diff = deposit - dep;
                      const monthly = Math.round((diff * 10000 * rate) / 100 / 12);
                      return (
                        <tr key={dep} className="border-b border-surface-100 last:border-0">
                          <td className="px-4 py-2.5 t-text">
                            {dep === 0 ? "보증금 없음" : formatPrice(dep)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-brand-700">
                            월 {monthly.toLocaleString()}원
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs t-text-tertiary">
              전환율 {conversionRate}% 기준. 실제 임대료는 시장 상황에 따라 다를 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Shared Components
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function RateScenarioSlider({
  principal,
  rate,
  years,
  currentMonthly,
  rateOffset,
  onOffsetChange,
}: {
  principal: number;
  rate: number;
  years: number;
  currentMonthly: number;
  rateOffset: number;
  onOffsetChange: (v: number) => void;
}) {
  const newRate = Math.max(0.1, rate + rateOffset);
  const newMonthly = Math.round(calcEqualPaymentMonthly(principal, newRate, years));
  const diff = newMonthly - currentMonthly;

  return (
    <div className="mt-6 rounded-2xl border t-border bg-[var(--color-surface-card)] p-6">
      <h2 className="text-lg font-bold t-text">금리가 바뀌면?</h2>
      <p className="mt-1 text-sm t-text-secondary">
        슬라이더를 움직여 금리 변동에 따른 월 상환액 변화를 확인하세요
      </p>

      <div className="mt-4">
        <input
          type="range"
          min={-2}
          max={2}
          step={0.25}
          value={rateOffset}
          onChange={(e) => onOffsetChange(parseFloat(e.target.value))}
          className="w-full accent-brand-600"
        />
        <div className="mt-1 flex justify-between text-xs t-text-tertiary">
          <span>-2.0%p</span>
          <span>현재</span>
          <span>+2.0%p</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-surface-50 p-3">
          <p className="text-[11px] t-text-secondary">현재 금리</p>
          <p className="mt-1 text-lg font-bold tabular-nums t-text">{rate.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl bg-surface-50 p-3">
          <p className="text-[11px] t-text-secondary">변경 후</p>
          <p className="mt-1 text-lg font-bold tabular-nums t-text">{newRate.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl bg-surface-50 p-3">
          <p className="text-[11px] t-text-secondary">월 상환액 차이</p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              diff > 0 ? "text-drop" : diff < 0 ? "text-brand-600" : "t-text"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diff.toLocaleString()}원
          </p>
        </div>
      </div>

      {rateOffset !== 0 && (
        <p
          className={`mt-3 text-center text-sm font-semibold ${
            diff < 0 ? "text-brand-600" : "text-drop"
          }`}
        >
          {diff < 0
            ? `금리 ${Math.abs(rateOffset).toFixed(2)}%p 낮추면 월 ${Math.abs(diff).toLocaleString()}원 절약`
            : `금리 ${rateOffset.toFixed(2)}%p 오르면 월 ${diff.toLocaleString()}원 추가 부담`}
        </p>
      )}
    </div>
  );
}

function ResultCard({
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
