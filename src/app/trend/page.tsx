import type { Metadata } from "next";
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { desc, and, inArray, sql } from "drizzle-orm";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import { formatPrice } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "부동산 시장 트렌드",
  description:
    "전국 아파트 거래량 추이, 시도별 평균 거래가 비교, 월별 거래 동향 등 부동산 시장 트렌드를 한눈에 확인하세요.",
  keywords: [
    "부동산 트렌드",
    "아파트 거래량",
    "부동산 시장 동향",
    "시도별 평균 시세",
    "부동산 시장 분석",
    "아파트 거래 추이",
    "전국 부동산 시세",
    "부동산 통계",
  ],
  alternates: { canonical: "/trend" },
};

export default async function TrendPage() {
  // 최근 6개월 월별 거래량 추이
  let volumeRaw: { trade_date: string }[] = [];

  try {
    volumeRaw = await db.select({
      trade_date: aptTransactions.tradeDate,
    }).from(aptTransactions)
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(50000);
  } catch (error) {
    console.error("월별 거래량 데이터 조회 실패:", error);
  }

  // 월별 거래량 집계 (서버 사이드)
  let monthlyVolume: { month: string; count: number }[] = [];

  if (volumeRaw.length > 0) {
    const countMap = new Map<string, number>();
    for (const row of volumeRaw) {
      const td = String(row.trade_date ?? "");
      const month = td.substring(0, 7); // "YYYY-MM"
      if (month) {
        countMap.set(month, (countMap.get(month) ?? 0) + 1);
      }
    }
    monthlyVolume = Array.from(countMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6)
      .reverse();
  }

  // 시도별 평균 거래가 비교
  const sidoEntries = Object.entries(REGION_HIERARCHY);
  let sidoAvgPrices: { name: string; slug: string; avgPrice: number; count: number }[] = [];

  try {
    sidoAvgPrices = await Promise.all(
      sidoEntries.map(async ([, sido]) => {
        const sigunguCodes = Object.keys(sido.sigungu);

        const rows = await db.select({
          trade_price: aptTransactions.tradePrice,
          count: sql<number>`count(*) over ()`,
        }).from(aptTransactions)
          .where(inArray(aptTransactions.regionCode, sigunguCodes))
          .orderBy(desc(aptTransactions.tradeDate))
          .limit(1000);

        const prices = rows.map((d) => Number(d.trade_price ?? 0));
        const avgPrice =
          prices.length > 0
            ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
            : 0;

        return {
          name: sido.shortName,
          slug: sido.slug,
          avgPrice,
          count: prices.length,
        };
      })
    );
  } catch (error) {
    console.error("시도별 평균 거래가 조회 실패:", error);
  }

  const sortedSido = [...sidoAvgPrices]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.avgPrice - a.avgPrice);

  // 전체 통계
  const totalVolume = monthlyVolume.reduce((a, b) => a + b.count, 0);
  const maxMonthly = Math.max(...monthlyVolume.map((m) => m.count), 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
            부동산 시장 트렌드
          </h1>
        </div>
        <p className="mt-2 text-sm t-text-secondary">
          전국 아파트 거래량 추이와 시도별 평균 거래가를 한눈에 비교하세요.
        </p>
      </section>

      {/* 월별 거래량 추이 */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold t-text">
          전국 거래량 추이 (최근 6개월)
        </h2>

        {monthlyVolume.length === 0 ? (
          <p className="rounded-xl border t-border t-card px-4 py-8 text-center text-sm t-text-tertiary">
            거래량 데이터를 불러올 수 없습니다.
          </p>
        ) : (
          <>
            {/* Summary stat cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border t-border t-card p-4">
                <p className="text-[10px] font-medium t-text-secondary">
                  6개월 총 거래량
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums t-text">
                  {totalVolume.toLocaleString()}건
                </p>
              </div>
              {monthlyVolume.length > 0 && (
                <div className="rounded-xl border t-border t-card p-4">
                  <p className="text-[10px] font-medium t-text-secondary">
                    최근 월 ({monthlyVolume[monthlyVolume.length - 1].month})
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums t-text">
                    {monthlyVolume[monthlyVolume.length - 1].count.toLocaleString()}건
                  </p>
                </div>
              )}
              {monthlyVolume.length >= 2 && (
                <div className="rounded-xl border t-border t-card p-4">
                  <p className="text-[10px] font-medium t-text-secondary">
                    전월 대비
                  </p>
                  {(() => {
                    const curr = monthlyVolume[monthlyVolume.length - 1].count;
                    const prev = monthlyVolume[monthlyVolume.length - 2].count;
                    const diff = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
                    const isUp = diff >= 0;
                    return (
                      <p
                        className={`mt-1 text-xl font-bold tabular-nums ${isUp ? "t-rise" : "t-drop"}`}
                      >
                        {isUp ? "+" : ""}
                        {diff.toFixed(1)}%
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Simple bar chart (CSS-based) */}
            <div className="rounded-xl border t-border t-card p-5">
              <div className="flex items-end gap-2" style={{ height: 160 }}>
                {monthlyVolume.map((m) => {
                  const heightPct = (m.count / maxMonthly) * 100;
                  return (
                    <div
                      key={m.month}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-[10px] font-semibold tabular-nums t-text-secondary">
                        {m.count.toLocaleString()}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-brand-400"
                        style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          minHeight: 4,
                        }}
                      />
                      <span className="text-[10px] tabular-nums t-text-tertiary">
                        {m.month.substring(5)}월
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      <AdSlot slotId="trend-infeed" format="infeed" className="my-6" />

      {/* 시도별 평균 거래가 비교 */}
      <section>
        <h2 className="mb-4 text-lg font-bold t-text">
          시도별 평균 거래가 비교
        </h2>

        {sortedSido.length === 0 ? (
          <p className="rounded-xl border t-border t-card px-4 py-8 text-center text-sm t-text-tertiary">
            시도별 데이터를 불러올 수 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">시도</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">
                    평균 거래가
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래 건수</th>
                </tr>
              </thead>
              <tbody>
                {sortedSido.map((sido, i) => {
                  const maxAvg = sortedSido[0].avgPrice || 1;
                  const barPct = (sido.avgPrice / maxAvg) * 100;

                  return (
                    <tr
                      key={sido.slug}
                      className="transition hover:bg-[var(--color-surface-elevated)]"
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 tabular-nums t-text-tertiary">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold t-text">
                        {sido.name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-2 w-24 overflow-hidden rounded-full t-elevated sm:block">
                            <div
                              className="h-full rounded-full bg-brand-400"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <span className="font-bold tabular-nums t-text">
                            {formatPrice(sido.avgPrice)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                        {sido.count.toLocaleString()}건
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
