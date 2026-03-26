"use client";

import { useState, useEffect } from "react";
import { formatKrw, formatPrice } from "@/lib/format";
import CoupangBanner from "@/components/CoupangBanner";
import { trackCalculate } from "@/lib/analytics/events";
import {
  CalcResult,
  numericInput,
  parseManwon,
  inputClass,
  selectClass,
} from "../lib/calc-utils";
import { ResultCard } from "./ResultCard";
import { RateScenarioSlider } from "./RateScenarioSlider";
import { CpaBanner } from "./CpaBanner";

export function LoanCalculatorTab() {
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
      trackCalculate("loan", { principal: principalNum, rate: parseFloat(rate), years: parseInt(years) });
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

          {/* CPA 대출 비교 배너 */}
          <CpaBanner />

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
