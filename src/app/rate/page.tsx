import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import AdSlot from "@/components/ads/AdSlot";
import { RATE_LABELS, RATE_DESCRIPTIONS, RATE_ORDER } from "@/lib/format";

export const metadata: Metadata = {
  title: "금리 현황",
  description: "한국은행 기준금리, COFIX, CD금리, 국고채 금리 실시간 추이. 매일 자동 업데이트.",
};

export const revalidate = 0;

export default async function RateDashboardPage() {
  const supabase = await createClient();

  const { data: allRates } = await supabase
    .from("finance_rates")
    .select("*")
    .order("base_date", { ascending: false })
    .limit(100);

  const latestByType = new Map<string, {
    rate_type: string;
    rate_value: number;
    prev_value: number | null;
    change_bp: number | null;
    base_date: string;
  }>();

  const historyByType = new Map<string, Array<{ date: string; value: number }>>();

  for (const r of allRates ?? []) {
    if (!latestByType.has(r.rate_type)) {
      latestByType.set(r.rate_type, r);
    }
    const history = historyByType.get(r.rate_type) ?? [];
    history.push({ date: r.base_date, value: r.rate_value });
    historyByType.set(r.rate_type, history);
  }

  const hasData = latestByType.size > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold text-dark-900">금리 현황</h1>
        </div>
        <p className="text-sm text-gray-500">
          주택담보대출과 관련된 주요 금리 지표를 한눈에 확인하세요.
        </p>
      </div>

      {hasData ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RATE_ORDER.map((type) => {
              const rate = latestByType.get(type);
              if (!rate) return null;
              return (
                <RateDetailCard
                  key={type}
                  label={RATE_LABELS[type] ?? type}
                  description={RATE_DESCRIPTIONS[type] ?? ""}
                  value={rate.rate_value}
                  changeBp={rate.change_bp}
                  baseDate={rate.base_date}
                  history={historyByType.get(type)?.reverse() ?? []}
                />
              );
            })}
          </div>

          <AdSlot slotId="rate-mid-banner" format="banner" />

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-dark-900">최근 금리 변동 이력</h2>
            <div className="rounded-2xl border border-surface-200 bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface-50 text-left text-xs text-gray-500">
                    <th className="px-4 py-3">지표</th>
                    <th className="px-4 py-3 text-right">현재</th>
                    <th className="px-4 py-3 text-right">이전</th>
                    <th className="px-4 py-3 text-right">변동</th>
                    <th className="px-4 py-3 text-right">기준일</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_ORDER.map((type) => {
                    const rate = latestByType.get(type);
                    if (!rate) return null;
                    return (
                      <tr key={type} className="border-b border-surface-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-dark-900">
                          {RATE_LABELS[type]}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {rate.rate_value}%
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 tabular-nums">
                          {rate.prev_value !== null ? `${rate.prev_value}%` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {rate.change_bp !== null && rate.change_bp !== 0 ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                rate.change_bp > 0
                                  ? "bg-drop-bg text-drop"
                                  : "bg-rise-bg text-rise"
                              }`}
                            >
                              {rate.change_bp > 0 ? "▲" : "▼"}{" "}
                              {Math.abs(rate.change_bp)}bp
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {rate.base_date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-surface-200 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-xl">
            📊
          </div>
          <p className="mt-3 text-sm text-gray-500">
            아직 수집된 금리 데이터가 없습니다.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            ECOS API 키가 설정되면 매일 자동으로 금리 데이터가 수집됩니다.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          href="/rate/calculator"
          className="card-hover rounded-2xl border-2 border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 text-center"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-lg">
            🏠
          </div>
          <p className="mt-2 font-bold text-brand-900">대출 이자 계산기</p>
          <p className="mt-1 text-sm text-brand-600">
            현재 금리로 내 대출 이자를 계산해 보세요
          </p>
        </Link>
        <Link
          href="/"
          className="card-hover rounded-2xl border border-surface-200 bg-white p-6 text-center"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-dark-900 text-lg text-white">
            📉
          </div>
          <p className="mt-2 font-bold text-dark-900">폭락/신고가 랭킹</p>
          <p className="mt-1 text-sm text-gray-500">
            오늘 가장 많이 떨어진 아파트 확인
          </p>
        </Link>
      </div>
    </div>
  );
}

function RateDetailCard({
  label,
  description,
  value,
  changeBp,
  baseDate,
  history,
}: {
  label: string;
  description: string;
  value: number;
  changeBp: number | null;
  baseDate: string;
  history: Array<{ date: string; value: number }>;
}) {
  const minVal = history.length > 0 ? Math.min(...history.map((h) => h.value)) : value;
  const maxVal = history.length > 0 ? Math.max(...history.map((h) => h.value)) : value;
  const range = maxVal - minVal || 0.1;

  return (
    <div className="card-hover rounded-2xl border border-surface-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-dark-900">{value}%</p>
        </div>
        {changeBp !== null && changeBp !== 0 && (
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ${
              changeBp > 0 ? "bg-drop-bg text-drop" : "bg-rise-bg text-rise"
            }`}
          >
            {changeBp > 0 ? "▲" : "▼"} {Math.abs(changeBp)}bp
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
      <p className="mt-0.5 text-[11px] text-gray-300">기준일: {baseDate}</p>

      {history.length > 1 && (
        <div className="mt-3 flex items-end gap-0.5 h-8">
          {history.slice(-12).map((h, i) => {
            const height = ((h.value - minVal) / range) * 100;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-brand-300"
                style={{ height: `${Math.max(height, 10)}%` }}
                title={`${h.date}: ${h.value}%`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
