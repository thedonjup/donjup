import type { Metadata } from "next";
import { formatPrice } from "@/lib/format";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";
import TrackedLink from "@/components/analytics/TrackedLink";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import {
  activeMarketRegionCount,
  highestMarketHigh,
  marketTrendEmptyStateCopy,
  strongestMarketDrop,
  totalMarketCount,
  totalSigunguCount,
} from "@/lib/market-trend-landing";
import {
  isDatabaseResourceLimitError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  getMarketSidoEntries,
  type MarketSidoStat,
} from "@/lib/market-dashboard-data";
import { getCachedMarketSidoStats } from "@/lib/market-dashboard-query";
import { parsePropertyTypeParam } from "@/lib/transaction-signal-data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "전국 시도별 아파트 시세 - 폭락 순위 & 신고가",
  description:
    "전국 17개 시·도별 아파트 실거래가 현황. 각 지역별 폭락 순위, 신고가, 거래량을 한눈에 비교하세요.",
  keywords: [
    "전국 아파트 시세",
    "시도별 아파트 가격",
    "아파트 폭락",
    "전국 부동산",
  ],
  alternates: { canonical: "/market" },
  openGraph: {
    title: "전국 시도별 아파트 시세 - 폭락 순위 & 신고가",
    description:
      "전국 17개 시·도별 아파트 실거래가, 최대 하락, 신고가, 최근 3개월 중위가를 비교하세요.",
    url: "/market",
    type: "website",
    images: [{ url: "/market/opengraph-image", width: 1200, height: 630, alt: "전국 아파트 시장 현황" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "전국 시도별 아파트 시세 - 폭락 순위 & 신고가",
    description: "지역별 실거래가 신호와 최근 가격 흐름을 돈줍에서 확인하세요.",
  },
};

export default async function MarketIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const validType = parsePropertyTypeParam(typeParam);

  const sidoEntries = getMarketSidoEntries();
  let sidoStats: MarketSidoStat[] = [];
  let dataUnavailable = false;

  try {
    sidoStats = await getCachedMarketSidoStats(validType);
  } catch (error) {
    dataUnavailable = isDatabaseResourceLimitError(error);
    logDatabaseFailure("Market page query failed", error, {
      route: "/market",
    });
  }

  const sorted = [...sidoStats].sort((a, b) => b.count - a.count);
  const totalCount = totalMarketCount(sidoStats);
  const activeSidoCount = activeMarketRegionCount(sidoStats);
  const sigunguCount = totalSigunguCount(sidoStats);
  const topDrop = strongestMarketDrop(sidoStats);
  const topHigh = highestMarketHigh(sidoStats);
  const totalSidoCount = sidoEntries.length;
  const emptyState = marketTrendEmptyStateCopy("market", dataUnavailable);
  const basisLabel = activeSidoCount > 0
    ? `최근 3개월 가격 통계 · ${activeSidoCount}/${totalSidoCount}개 시·도 거래 신호`
    : emptyState.basisLabel;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "지역별 시세", href: "/market" },
        ]}
      />
      <PropertyTypeFilter currentType={validType} />
      <SignalLandingHeader
        eyebrow="지역 시세 레이더"
        title="전국 시·도별 아파트 시세"
        description="전국 17개 시·도별 거래량, 최대 하락, 신고가, 최근 가격대를 한 화면에서 비교하세요."
        basisLabel={basisLabel}
        stats={[
          {
            label: "수집 거래",
            value: `${totalCount.toLocaleString()}건`,
            hint: "거래량순으로 지역을 정렬합니다",
          },
          {
            label: "탐색 지역",
            value: `${sigunguCount.toLocaleString()}곳`,
            hint: "시군구 단위로 한 단계 더 들어갑니다",
          },
          {
            label: "최대 하락",
            value: topDrop ? `▼ ${Math.abs(topDrop.change_rate).toFixed(1)}%` : "-",
            hint: topDrop?.apt_name ?? "하락 신호가 준비 중입니다",
          },
          {
            label: "최고 신고가",
            value: topHigh ? formatPrice(topHigh.trade_price) : "-",
            hint: topHigh?.apt_name ?? "신고가 신호가 준비 중입니다",
          },
        ]}
        primaryHref="/today"
        primaryLabel="오늘 하락 보기"
        secondaryHref="/trend"
        secondaryLabel="거래량 흐름 보기"
        eventScope="market"
        tone="neutral"
      />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold t-text">시도별 탐색</h2>
            <p className="mt-1 text-sm t-text-secondary">
              거래가 많은 지역부터 훑고, 카드 안의 하락·신고가 신호로 다음 탐색 지역을 고르세요.
            </p>
          </div>
          <p className="text-xs font-semibold t-text-tertiary">
            총 {totalCount.toLocaleString()}건 · 거래량순 정렬
          </p>
        </section>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed t-border p-10 text-center">
          <p className="text-sm font-semibold t-text-secondary">{emptyState.title}</p>
          <p className="mt-1 text-xs t-text-tertiary">{emptyState.description}</p>
          {dataUnavailable && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <TrackedLink
                href="/market"
                ctaName="market_unavailable_retry_click"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                다시 시도
              </TrackedLink>
              <TrackedLink
                href="/today"
                ctaName="market_unavailable_today_click"
                className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
              >
                최신 거래 보기
              </TrackedLink>
            </div>
          )}
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((sido, i) => (
          <TrackedLink
            key={sido.code}
            href={`/market/${sido.slug}`}
            ctaName="market_sido_card_click"
            params={{
              rank: i + 1,
              sido: sido.slug,
              transaction_count: sido.count,
              top_drop_rate: sido.topDrop?.change_rate,
            }}
            className="card-hover block rounded-2xl border t-border t-card p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rank-badge rank-badge-gold text-[11px]">{i + 1}</span>
                <h2 className="text-base font-bold t-text">{sido.name}</h2>
              </div>
              <span className="rounded-full t-elevated px-2.5 py-0.5 text-xs font-semibold tabular-nums t-text-secondary">
                {sido.count.toLocaleString()}건
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* 최대 폭락 */}
              {sido.topDrop ? (
                <div className="rounded-lg t-drop-bg px-3 py-2">
                  <p className="text-[10px] font-medium t-text-secondary">최대 하락</p>
                  <p className="mt-0.5 truncate text-xs font-semibold t-text">
                    {sido.topDrop.apt_name}
                  </p>
                  <p className="text-sm font-bold tabular-nums t-drop">
                    ▼ {Math.abs(sido.topDrop.change_rate)}%
                  </p>
                </div>
              ) : (
                <div className="rounded-lg t-elevated px-3 py-2">
                  <p className="text-[10px] t-text-tertiary">하락 거래 없음</p>
                </div>
              )}

              {/* 최신 신고가 */}
              {sido.topHigh ? (
                <div className="rounded-lg t-rise-bg px-3 py-2">
                  <p className="text-[10px] font-medium t-text-secondary">신고가</p>
                  <p className="mt-0.5 truncate text-xs font-semibold t-text">
                    {sido.topHigh.apt_name}
                  </p>
                  <p className="text-sm font-bold tabular-nums t-rise">
                    {formatPrice(sido.topHigh.trade_price)}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg t-elevated px-3 py-2">
                  <p className="text-[10px] t-text-tertiary">신고가 없음</p>
                </div>
              )}
            </div>

            {(sido.medianPrice > 0 || sido.avgPrice > 0) && (
              <div className="mt-3 pt-3 border-t t-border flex gap-4 text-xs">
                <div>
                  <p className="t-text-tertiary">최근 3개월 중위가</p>
                  <p className="font-semibold t-text tabular-nums">{formatPrice(sido.medianPrice)}</p>
                </div>
                <div>
                  <p className="t-text-tertiary">평균가</p>
                  <p className="font-semibold t-text tabular-nums">{formatPrice(sido.avgPrice)}</p>
                </div>
              </div>
            )}
          </TrackedLink>
        ))}
      </div>
      )}

        <SignalLandingFooter
          eventScope="market"
          methodTitle="지역 시세 기준"
          methodItems={[
            "거래량은 돈줍에 수집된 실거래 데이터를 기준으로 집계합니다.",
            "최근 3개월 중위가와 평균가는 직거래를 제외한 가격으로 계산합니다.",
            "최대 하락은 과거 최고가 대비 변동률이 확인된 거래 중 가장 큰 하락 신호입니다.",
            "지역 카드를 누르면 시군구별 신호로 좁혀 볼 수 있습니다.",
          ]}
          relatedLinks={[
            {
              href: "/trend",
              title: "거래량 트렌드",
              description: "최근 6개월 거래량과 시도별 평균 거래가를 함께 봅니다.",
            },
            {
              href: "/new-highs",
              title: "오늘 신고가",
              description: "지역별 신고가가 어디서 나오는지 확인합니다.",
            },
            {
              href: "/rent",
              title: "전월세 실거래",
              description: "매매 신호와 전월세 가격대를 같이 비교합니다.",
            },
            {
              href: "/search",
              title: "단지 검색",
              description: "관심 단지명이나 동네명으로 바로 이동합니다.",
            },
          ]}
        />
    </div>
    </div>
  );
}
