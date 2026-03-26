"use client";

import { formatPrice } from "@/lib/format";
import CoupangBanner from "@/components/CoupangBanner";
import { DsrResult as DsrResultType } from "../lib/calc-utils";
import { CpaBanner } from "./CpaBanner";

export function DsrResultDisplay({
  dsrResult,
  dsrLimit,
}: {
  dsrResult: DsrResultType;
  dsrLimit: number;
}) {
  return (
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
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                dsrResult.isWithinLimit
                  ? "bg-gradient-to-r from-brand-400 to-brand-600"
                  : "bg-gradient-to-r from-orange-400 to-red-500"
              }`}
              style={{ width: `${Math.min(dsrResult.dsr, 100)}%` }}
            />
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

      <CpaBanner />

      <CoupangBanner
        category="book"
        title="부동산 대출 가이드"
        limit={3}
        className="mt-2"
      />
    </div>
  );
}
