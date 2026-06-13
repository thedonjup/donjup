import type { Metadata } from "next";
import { formatPrice } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";
import TrackedLink from "@/components/analytics/TrackedLink";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import {
  latestMonthlyVolume,
  marketTrendEmptyStateCopy,
  monthOverMonthChangeRate,
  totalMonthlyVolume,
  type MonthlyVolume,
} from "@/lib/market-trend-landing";
import {
  isDatabaseResourceLimitError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  getCachedTrendMonthlyVolume,
  getCachedTrendSidoAvgPrices,
  type TrendSidoAvgPrice,
} from "@/lib/trend-dashboard-query";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "부동산 시장 트렌드 - 아파트 거래량과 지역별 평균가",
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
  openGraph: {
    title: "부동산 시장 트렌드 - 아파트 거래량과 지역별 평균가",
    description:
      "전국 아파트 거래량 추이와 시도별 평균 거래가를 함께 확인하고 지역별 시세로 이어서 탐색하세요.",
    url: "/trend",
    type: "website",
    images: [{ url: "/trend/opengraph-image", width: 1200, height: 630, alt: "부동산 트렌드 분석" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "부동산 시장 트렌드",
    description: "전국 아파트 거래량과 지역별 평균 거래가 흐름을 확인하세요.",
  },
};

export default async function TrendPage() {
  let monthlyVolume: MonthlyVolume[] = [];
  let volumeUnavailable = false;

  try {
    monthlyVolume = await getCachedTrendMonthlyVolume();
  } catch (error) {
    volumeUnavailable = isDatabaseResourceLimitError(error);
    logDatabaseFailure("Trend volume query failed", error, {
      route: "/trend",
    });
  }

  let sidoAvgPrices: TrendSidoAvgPrice[] = [];
  let priceUnavailable = false;

  try {
    sidoAvgPrices = await getCachedTrendSidoAvgPrices();
  } catch (error) {
    priceUnavailable = isDatabaseResourceLimitError(error);
    logDatabaseFailure("Trend price query failed", error, {
      route: "/trend",
    });
  }

  const sortedSido = [...sidoAvgPrices]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.avgPrice - a.avgPrice);

  const totalVolume = totalMonthlyVolume(monthlyVolume);
  const latestVolume = latestMonthlyVolume(monthlyVolume);
  const momChange = monthOverMonthChangeRate(monthlyVolume);
  const maxMonthly = Math.max(...monthlyVolume.map((m) => m.count), 1);
  const volumeEmptyState = marketTrendEmptyStateCopy("trend-volume", volumeUnavailable);
  const priceEmptyState = marketTrendEmptyStateCopy("trend-price", priceUnavailable);
  const basisLabel =
    volumeUnavailable || priceUnavailable
      ? "데이터 연결 확인 중"
      : "최근 거래일 기준 · 돈줍 수집 실거래 데이터";

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "부동산 시장 트렌드", href: "/trend" },
        ]}
      />
      <SignalLandingHeader
        eyebrow="시장 흐름판"
        title="부동산 시장 트렌드"
        description="최근 6개월 전국 아파트 거래량과 시도별 평균 거래가를 함께 보며 다음 탐색 지역을 고르세요."
        basisLabel={basisLabel}
        stats={[
          {
            label: "6개월 거래량",
            value: `${totalVolume.toLocaleString()}건`,
            hint: "최근 6개 월별 거래량 합계입니다",
          },
          {
            label: "최근 월",
            value: latestVolume ? `${latestVolume.count.toLocaleString()}건` : "-",
            hint: latestVolume ? `${latestVolume.month} 거래량` : "월별 거래량 준비 중",
          },
          {
            label: "전월 대비",
            value: momChange === null ? "-" : `${momChange > 0 ? "+" : ""}${momChange.toFixed(1)}%`,
            hint: momChange === null ? "비교 가능한 전월 데이터가 필요합니다" : "최근 월 거래량 변화율입니다",
          },
          {
            label: "가격 비교 지역",
            value: `${sortedSido.length.toLocaleString()}곳`,
            hint: "시도별 평균 거래가 표에서 바로 이동합니다",
          },
        ]}
        primaryHref="/market"
        primaryLabel="지역별 시세 보기"
        secondaryHref="/today"
        secondaryLabel="오늘 거래 보기"
        eventScope="trend"
        tone="neutral"
      />

      <div className="mx-auto max-w-6xl px-4 py-8">

      {/* 월별 거래량 추이 */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold t-text">
          전국 거래량 추이 (최근 6개월)
        </h2>

        {monthlyVolume.length === 0 ? (
          <div className="rounded-xl border t-border t-card px-4 py-8 text-center">
            <p className="text-sm font-semibold t-text-secondary">{volumeEmptyState.title}</p>
            <p className="mt-1 text-xs t-text-tertiary">{volumeEmptyState.description}</p>
            {volumeUnavailable && (
              <TrackedLink
                href="/trend"
                ctaName="trend_volume_unavailable_retry_click"
                className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                다시 시도
              </TrackedLink>
            )}
          </div>
        ) : (
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
        )}
      </section>

      <AdSlot slotId="trend-infeed" format="infeed" className="my-6" />

      {/* 시도별 평균 거래가 비교 */}
      <section>
        <h2 className="mb-4 text-lg font-bold t-text">
          시도별 평균 거래가 비교
        </h2>

        {sortedSido.length === 0 ? (
          <div className="rounded-xl border t-border t-card px-4 py-8 text-center">
            <p className="text-sm font-semibold t-text-secondary">{priceEmptyState.title}</p>
            <p className="mt-1 text-xs t-text-tertiary">{priceEmptyState.description}</p>
            {priceUnavailable && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <TrackedLink
                  href="/trend"
                  ctaName="trend_price_unavailable_retry_click"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
                >
                  다시 시도
                </TrackedLink>
                <TrackedLink
                  href="/market"
                  ctaName="trend_price_unavailable_market_click"
                  className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
                >
                  지역별 시세 보기
                </TrackedLink>
              </div>
            )}
          </div>
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
                        <TrackedLink
                          href={`/market/${sido.slug}`}
                          ctaName="trend_market_region_click"
                          params={{
                            rank: i + 1,
                            sido: sido.slug,
                            avg_price: sido.avgPrice,
                            transaction_count: sido.count,
                          }}
                          className="font-semibold t-text underline-offset-4 transition hover:underline"
                        >
                          {sido.name}
                        </TrackedLink>
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

        <SignalLandingFooter
          eventScope="trend"
          methodTitle="트렌드 산정 기준"
          methodItems={[
            "월별 거래량은 최근 거래일부터 역순으로 수집한 실거래 데이터를 월 단위로 묶어 계산합니다.",
            "시도별 평균 거래가는 각 시도에서 최근 거래 1,000건까지를 기준으로 비교합니다.",
            "전월 대비는 최근 월과 직전 월의 거래량 변화율입니다.",
            "표의 시도명을 누르면 해당 지역의 시군구별 시세 페이지로 이동합니다.",
          ]}
          relatedLinks={[
            {
              href: "/market",
              title: "지역별 시세",
              description: "거래량 흐름에서 발견한 지역을 시군구별로 좁혀봅니다.",
            },
            {
              href: "/today",
              title: "오늘 하락 거래",
              description: "시장의 약한 신호가 개별 단지에서 어떻게 보이는지 확인합니다.",
            },
            {
              href: "/new-highs",
              title: "오늘 신고가",
              description: "강한 가격 신호가 나온 단지와 지역을 확인합니다.",
            },
            {
              href: "/rate",
              title: "대출 금리",
              description: "거래량과 가격 흐름을 금리 부담과 함께 봅니다.",
            },
          ]}
        />
    </div>
    </div>
  );
}
