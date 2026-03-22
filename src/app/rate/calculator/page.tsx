"use client";

import { useState } from "react";

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

export default function CalculatorPage() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("3.5");
  const [years, setYears] = useState("30");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateOffset, setRateOffset] = useState(0);

  const handleCalculate = async () => {
    const principalNum = parseInt(principal.replace(/,/g, ""), 10);
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
        <h1 className="text-2xl font-extrabold text-dark-900">대출 이자 계산기</h1>
      </div>
      <p className="text-sm text-gray-500">
        주택담보대출 이자를 상환 방식별로 비교해 보세요.
      </p>

      {/* Input Form */}
      <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-dark-900">
              대출 원금 (만원)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={principal}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setPrincipal(raw ? parseInt(raw).toLocaleString() : "");
              }}
              placeholder="30,000"
              className="mt-1.5 block w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-lg font-bold tabular-nums text-dark-900 placeholder:text-gray-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {principal && (
              <p className="mt-1 text-xs text-gray-400">
                {formatKrw(parseInt(principal.replace(/,/g, ""), 10) * 10000)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-900">
              연 금리 (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-lg font-bold tabular-nums text-dark-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-900">
              상환 기간
            </label>
            <select
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-lg font-bold text-dark-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
          className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 text-lg font-bold text-white transition hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400"
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

          {/* CPA Funnel */}
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-r from-brand-50 to-white p-6 text-center">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="https://link.tenping.kr/redirect?campaignId=PLACEHOLDER_FINDA"
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover flex items-center justify-between rounded-2xl border border-surface-200 bg-white p-4"
              >
                <div>
                  <p className="font-bold text-dark-900">핀다</p>
                  <p className="text-sm text-gray-500">88개 금융사 금리 비교</p>
                </div>
                <span className="text-sm font-semibold text-brand-600">비교하기 &rarr;</span>
              </a>
              <a
                href="https://link.tenping.kr/redirect?campaignId=PLACEHOLDER_BANKSALAD"
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover flex items-center justify-between rounded-2xl border border-surface-200 bg-white p-4"
              >
                <div>
                  <p className="font-bold text-dark-900">뱅크샐러드</p>
                  <p className="text-sm text-gray-500">주담대 최저금리 찾기</p>
                </div>
                <span className="text-sm font-semibold text-brand-600">비교하기 &rarr;</span>
              </a>
            </div>

            <a
              href="https://link.tenping.kr/redirect?campaignId=PLACEHOLDER_CREDIT"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-surface-200 bg-surface-50 p-4 text-center transition hover:bg-surface-100"
            >
              <p className="text-sm text-gray-600">
                내 신용점수 무료 조회하고 더 낮은 금리 받기
              </p>
              <p className="mt-1 text-xs font-semibold text-brand-600">
                무료 조회하기 &rarr;
              </p>
            </a>
          </div>

          {/* Schedule Preview */}
          {result.schedule_preview && result.schedule_preview.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-bold text-dark-900">
                월별 상환 스케줄 (원리금균등, 12개월)
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-surface-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-surface-50 text-left text-xs text-gray-500">
                      <th className="px-4 py-3">회차</th>
                      <th className="px-4 py-3 text-right">원금</th>
                      <th className="px-4 py-3 text-right">이자</th>
                      <th className="px-4 py-3 text-right">잔금</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule_preview.map((row) => (
                      <tr key={row.month} className="border-b border-surface-100 last:border-0">
                        <td className="px-4 py-2.5 text-dark-900">{row.month}개월</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                          {row.principal.toLocaleString()}원
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-drop">
                          {row.interest.toLocaleString()}원
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
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
    </div>
  );
}

function calcEqualPaymentMonthly(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

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
    <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-6">
      <h2 className="text-lg font-bold text-dark-900">금리가 바뀌면?</h2>
      <p className="mt-1 text-sm text-gray-500">
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
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>-2.0%p</span>
          <span>현재</span>
          <span>+2.0%p</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-surface-50 p-3">
          <p className="text-[11px] text-gray-500">현재 금리</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-dark-900">{rate.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl bg-surface-50 p-3">
          <p className="text-[11px] text-gray-500">변경 후</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-dark-900">{newRate.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl bg-surface-50 p-3">
          <p className="text-[11px] text-gray-500">월 상환액 차이</p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              diff > 0 ? "text-drop" : diff < 0 ? "text-brand-600" : "text-dark-900"
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
          ? "border-brand-200 bg-gradient-to-br from-brand-50 to-white"
          : "border-surface-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${highlight ? "text-brand-700" : "text-gray-500"}`}>{title}</p>
      <p className="text-xs text-gray-400">{description}</p>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-dark-900">
        {monthlyPayment.toLocaleString()}
        <span className="ml-0.5 text-sm font-normal text-gray-400">원/월</span>
      </p>
      <p className="mt-1 text-xs text-gray-400">
        총 이자: {totalInterest.toLocaleString()}원
      </p>
    </div>
  );
}

function formatKrw(won: number): string {
  if (won >= 100000000) {
    const eok = Math.floor(won / 100000000);
    const rest = Math.floor((won % 100000000) / 10000);
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  }
  if (won >= 10000) {
    return `${Math.floor(won / 10000).toLocaleString()}만원`;
  }
  return `${won.toLocaleString()}원`;
}
