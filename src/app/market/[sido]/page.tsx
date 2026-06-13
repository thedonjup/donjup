import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REGION_HIERARCHY, getSidoBySlug } from "@/lib/constants/region-codes";
import { formatPrice } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";
import TrackedLink from "@/components/analytics/TrackedLink";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getCachedMarketSigunguStats } from "@/lib/market-dashboard-query";
import type { MarketSigunguStat } from "@/lib/market-dashboard-data";
import {
  activeMarketRegionCount,
  highestMarketHigh,
  strongestMarketDrop,
  totalMarketCount,
} from "@/lib/market-trend-landing";

export const revalidate = 3600;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
}

export async function generateStaticParams() {
  return Object.values(REGION_HIERARCHY).map((sido) => ({
    sido: sido.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sido: string }>;
}): Promise<Metadata> {
  const { sido: sidoSlug } = await params;
  const sido = getSidoBySlug(sidoSlug);
  if (!sido) return { title: "지역 정보" };

  return {
    title: `${sido.name} 시군구별 아파트 시세 - ${getCurrentMonth()}`,
    description: `${sido.name} 시군구별 아파트 실거래가 현황. 폭락 순위, 신고가, 거래량을 한눈에 비교하세요.`,
    alternates: { canonical: `/market/${sidoSlug}` },
    keywords: [
      `${sido.name} 아파트 시세`,
      `${sido.shortName} 부동산`,
      `${sido.shortName} 아파트 실거래가`,
      `${sido.name} 시군구별 시세`,
      `${sido.shortName} 아파트 폭락`,
      `${sido.shortName} 신고가`,
      "아파트 폭락 순위",
      "시군구별 시세",
    ],
    openGraph: {
      title: `${sido.name} 시군구별 아파트 시세`,
      description: `${sido.name}의 시군구별 거래량, 최대 하락, 신고가, 최근 가격대를 비교하세요.`,
      url: `/market/${sidoSlug}`,
      type: "website",
      images: [{ url: "/market/opengraph-image", width: 1200, height: 630, alt: `${sido.name} 아파트 시장 현황` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${sido.name} 시군구별 아파트 시세`,
      description: `${sido.shortName} 부동산 실거래가 신호를 시군구별로 확인하세요.`,
    },
  };
}

export default async function MarketSidoPage({
  params,
}: {
  params: Promise<{ sido: string }>;
}) {
  const { sido: sidoSlug } = await params;
  const sido = getSidoBySlug(sidoSlug);
  if (!sido) notFound();

  const sigunguEntries = Object.entries(sido.sigungu);

  let sigunguStats: MarketSigunguStat[] = [];

  try {
    sigunguStats = await getCachedMarketSigunguStats(sidoSlug);
  } catch {
    // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
  }

  const sorted = [...sigunguStats].sort((a, b) => b.count - a.count);
  const totalCount = totalMarketCount(sigunguStats);
  const activeRegionCount = activeMarketRegionCount(sigunguStats);
  const topDrop = strongestMarketDrop(sigunguStats);
  const topHigh = highestMarketHigh(sigunguStats);
  const basisLabel = `${getCurrentMonth()} 기준 · 최근 3개월 가격 통계`;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "지역별 시세", href: "/market" },
          { name: sido.name, href: `/market/${sidoSlug}` },
        ]}
      />
      <SignalLandingHeader
        eyebrow={`${sido.shortName} 지역 시세`}
        title={`${sido.name} 시군구별 아파트 시세`}
        description={`${sido.name} 안에서 거래가 많은 시군구와 최대 하락, 신고가, 최근 가격대를 비교하세요.`}
        basisLabel={basisLabel}
        stats={[
          {
            label: "수집 거래",
            value: `${totalCount.toLocaleString()}건`,
            hint: "시군구 카드의 거래량순 정렬 기준입니다",
          },
          {
            label: "거래 지역",
            value: `${activeRegionCount}/${sigunguEntries.length}곳`,
            hint: "거래가 포착된 시군구 수입니다",
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
        primaryHref="/market"
        primaryLabel="전국 지역 보기"
        secondaryHref={`/search?q=${encodeURIComponent(sido.name)}`}
        secondaryLabel={`${sido.shortName} 단지 검색`}
        eventScope="market_sido"
        tone="neutral"
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
          <Link href="/" className="hover:opacity-80">홈</Link>
          <span className="mx-2">/</span>
          <Link href="/market" className="hover:opacity-80">지역별 시세</Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>{sido.name}</span>
        </div>

        <section className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold t-text">시군구별 탐색</h2>
            <p className="mt-1 text-sm t-text-secondary">
              관심 시군구를 눌러 하락 거래, 신고가, 최신 거래 목록으로 바로 좁혀보세요.
            </p>
          </div>
          <p className="text-xs font-semibold t-text-tertiary">
            총 {totalCount.toLocaleString()}건 · {getCurrentMonth()} 기준
          </p>
        </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((region, i) => {
          const midIndex = Math.floor(sorted.length / 2);
          return (
            <React.Fragment key={region.code}>
              {i === midIndex && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <AdSlot slotId="market-sido-infeed" format="infeed" />
                </div>
              )}
              <TrackedLink
                href={`/market/${sidoSlug}/${region.code}`}
                ctaName="market_sido_region_card_click"
                params={{
                  rank: i + 1,
                  sido: sidoSlug,
                  region_code: region.code,
                  transaction_count: region.count,
                  top_drop_rate: region.topDrop?.change_rate,
                }}
                className="card-hover block rounded-2xl border t-border bg-[var(--color-surface-card)] p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rank-badge rank-badge-gold text-[11px]">{i + 1}</span>
                    <h2 className="text-base font-bold t-text">{region.name}</h2>
                  </div>
                  <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums t-text-secondary">
                    {region.count.toLocaleString()}건
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {region.topDrop ? (
                    <div className="rounded-lg bg-drop-bg px-3 py-2">
                      <p className="text-[10px] font-medium t-text-secondary">최대 하락</p>
                      <p className="mt-0.5 truncate text-xs font-semibold t-text">
                        {region.topDrop.apt_name}
                      </p>
                      <p className="text-sm font-bold tabular-nums text-drop">
                        ▼ {Math.abs(region.topDrop.change_rate)}%
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-surface-50 px-3 py-2">
                      <p className="text-[10px] t-text-tertiary">하락 거래 없음</p>
                    </div>
                  )}

                  {region.topHigh ? (
                    <div className="rounded-lg bg-rise-bg px-3 py-2">
                      <p className="text-[10px] font-medium t-text-secondary">신고가</p>
                      <p className="mt-0.5 truncate text-xs font-semibold t-text">
                        {region.topHigh.apt_name}
                      </p>
                      <p className="text-sm font-bold tabular-nums text-rise">
                        {formatPrice(region.topHigh.trade_price)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-surface-50 px-3 py-2">
                      <p className="text-[10px] t-text-tertiary">신고가 없음</p>
                    </div>
                  )}
                </div>

                {(region.medianPrice > 0 || region.avgPrice > 0) && (
                  <div className="mt-3 pt-3 border-t t-border flex gap-4 text-xs">
                    <div>
                      <p className="t-text-tertiary">최근 3개월 중위가</p>
                      <p className="font-semibold t-text tabular-nums">{formatPrice(region.medianPrice)}</p>
                    </div>
                    <div>
                      <p className="t-text-tertiary">평균가</p>
                      <p className="font-semibold t-text tabular-nums">{formatPrice(region.avgPrice)}</p>
                    </div>
                  </div>
                )}
              </TrackedLink>
            </React.Fragment>
          );
        })}
      </div>

        <SignalLandingFooter
          eventScope="market_sido"
          methodTitle={`${sido.shortName} 시세 기준`}
          methodItems={[
            "시군구 거래량은 돈줍에 수집된 해당 지역 실거래 데이터를 기준으로 합니다.",
            "최근 3개월 중위가와 평균가는 아파트 매매 거래 중 직거래를 제외해 계산합니다.",
            "최대 하락은 최고가 대비 변동률이 확인된 거래 중 가장 큰 하락 신호입니다.",
            "시군구 페이지로 들어가면 개별 단지 상세, 신고가, 최신 거래 목록까지 확인할 수 있습니다.",
          ]}
          relatedLinks={[
            {
              href: "/market",
              title: "전국 지역 비교",
              description: "다른 시·도와 거래량, 하락, 신고가 신호를 비교합니다.",
            },
            {
              href: "/trend",
              title: "거래량 트렌드",
              description: "최근 6개월 거래량 흐름으로 시장 온도를 확인합니다.",
            },
            {
              href: "/today",
              title: "오늘 하락 거래",
              description: "당일 포착된 주요 하락 거래를 빠르게 확인합니다.",
            },
            {
              href: "/new-highs",
              title: "오늘 신고가",
              description: "신고가가 나온 단지와 지역 흐름을 확인합니다.",
            },
          ]}
        />
    </div>
    </div>
  );
}
