"use client";

import { useState } from "react";
import type { Metadata } from "next";

// CSR이므로 metadata는 별도 layout에서 설정하거나 generateMetadata 불가
// 대신 Head에서 직접 설정

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

  const handleCalculate = async () => {
    const principalNum = parseInt(principal.replace(/,/g, ""), 10);
    if (!principalNum || !rate || !years) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rate/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: principalNum * 10000, // 만원 → 원
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
      <h1 className="text-2xl font-bold">대출 이자 계산기</h1>
      <p className="mt-1 text-sm text-gray-500">
        주택담보대출 이자를 상환 방식별로 비교해 보세요.
      </p>

      {/* 입력 폼 */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
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
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {principal && (
              <p className="mt-1 text-xs text-gray-400">
                {formatKrw(parseInt(principal.replace(/,/g, ""), 10) * 10000)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              연 금리 (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              상환 기간 (년)
            </label>
            <select
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-lg font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? "계산 중..." : "계산하기"}
        </button>
      </div>

      {/* 결과 */}
      {result && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

          {/* CPA 퍼널 — 3단계 (수익 핵심) */}
          <div className="mt-6 space-y-4">
            {/* 1단계: 감정 자극 */}
            <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 text-center">
              <p className="text-xl font-bold text-blue-900">
                월 {result.comparison.equal_payment.monthlyPayment.toLocaleString()}원, 더 줄일 수 있어요
              </p>
              <p className="mt-1 text-sm text-blue-600">
                금리 0.5%p만 낮춰도 월{" "}
                {Math.round(
                  (result.comparison.equal_payment.monthlyPayment -
                    result.comparison.equal_payment.monthlyPayment * 0.92)
                ).toLocaleString()}
                원 절약
              </p>
            </div>

            {/* 2단계: CPA 링크 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="https://link.tenping.kr/redirect?campaignId=PLACEHOLDER_FINDA"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
              >
                <div>
                  <p className="font-bold text-gray-900">핀다</p>
                  <p className="text-sm text-gray-500">88개 금융사 금리 비교</p>
                </div>
                <span className="text-sm font-medium text-blue-600">비교하기 &rarr;</span>
              </a>
              <a
                href="https://link.tenping.kr/redirect?campaignId=PLACEHOLDER_BANKSALAD"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
              >
                <div>
                  <p className="font-bold text-gray-900">뱅크샐러드</p>
                  <p className="text-sm text-gray-500">주담대 최저금리 찾기</p>
                </div>
                <span className="text-sm font-medium text-blue-600">비교하기 &rarr;</span>
              </a>
            </div>

            {/* 3단계: 보조 CPA (낮은 허들) */}
            <a
              href="https://link.tenping.kr/redirect?campaignId=PLACEHOLDER_CREDIT"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-gray-100 bg-gray-50 p-4 text-center transition hover:bg-gray-100"
            >
              <p className="text-sm text-gray-600">
                내 신용점수 무료 조회하고 더 낮은 금리 받기
              </p>
              <p className="mt-1 text-xs font-medium text-blue-600">
                무료 조회하기 &rarr;
              </p>
            </a>
          </div>

          {/* 상환 스케줄 미리보기 */}
          {result.schedule_preview && result.schedule_preview.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-bold">
                월별 상환 스케줄 (원리금균등, 12개월)
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                      <th className="px-4 py-2">회차</th>
                      <th className="px-4 py-2 text-right">원금</th>
                      <th className="px-4 py-2 text-right">이자</th>
                      <th className="px-4 py-2 text-right">잔금</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule_preview.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="px-4 py-2">{row.month}개월</td>
                        <td className="px-4 py-2 text-right">
                          {row.principal.toLocaleString()}원
                        </td>
                        <td className="px-4 py-2 text-right text-red-500">
                          {row.interest.toLocaleString()}원
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">
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
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-blue-200 bg-blue-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400">{description}</p>
      <p className="mt-3 text-2xl font-bold">
        {monthlyPayment.toLocaleString()}
        <span className="text-sm font-normal text-gray-400">원/월</span>
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
