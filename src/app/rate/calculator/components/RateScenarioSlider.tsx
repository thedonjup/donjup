"use client";

import { calcEqualPaymentMonthly } from "../lib/calc-utils";

export function RateScenarioSlider({
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
