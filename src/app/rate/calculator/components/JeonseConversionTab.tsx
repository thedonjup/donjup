"use client";

import { useState } from "react";
import { formatKrw, formatPrice } from "@/lib/format";
import { trackCalculate } from "@/lib/analytics/events";
import {
  JeonseResult,
  numericInput,
  parseManwon,
  inputClass,
} from "../lib/calc-utils";

export function JeonseConversionTab() {
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
    trackCalculate("jeonse_conversion", { deposit, rate });
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
