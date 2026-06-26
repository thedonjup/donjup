import type { Metadata } from "next";
import { formatPrice, formatArea } from "@/lib/format";
import { aptUrl } from "@/lib/apt-url";
import AdSlot from "@/components/ads/AdSlot";
import TrackedLink from "@/components/analytics/TrackedLink";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import { BreadcrumbJsonLd, DatasetJsonLd } from "@/components/seo/JsonLd";
import {
  latestRentTradeDate,
  maxMonthlyRent,
  maxRentDeposit,
  rateRentEmptyStateCopy,
  uniqueRentRegionCount,
} from "@/lib/rate-rent-landing";
import {
  isDatabaseResourceLimitError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  getRentSidoFilters,
  type RentDashboardRow,
} from "@/lib/rent-dashboard-data";
import { getCachedRentDashboardData } from "@/lib/rent-dashboard-query";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "전국 아파트 전월세 실거래가 | 전세 TOP·최근 월세",
  description: "전국 아파트 전세 고가 TOP과 최근 월세 실거래를 지역별로 확인하세요. 보증금, 월세, 면적, 거래일을 한눈에 비교할 수 있습니다.",
  keywords: ["아파트 전세 실거래가", "아파트 월세 실거래가", "전월세 시세", "전세 TOP", "월세 거래"],
  alternates: { canonical: "/rent" },
  openGraph: {
    title: "전국 아파트 전월세 실거래가 | 돈줍",
    description: "전세 고가 TOP과 최근 월세 거래를 지역별로 확인하세요.",
    url: "https://donjup.com/rent",
    siteName: "돈줍 DonJup",
    images: [{ url: "https://donjup.com/rent/opengraph-image", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "전국 아파트 전월세 실거래가 | 돈줍",
    description: "전세 고가 TOP과 최근 월세 거래를 지역별로 확인하세요.",
    images: ["https://donjup.com/rent/opengraph-image"],
  },
};

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { sido } = await searchParams;
  const sidoFilter = typeof sido === "string" ? sido : undefined;

  let jeonseItems: RentDashboardRow[] = [];
  let wolseItems: RentDashboardRow[] = [];
  let dataUnavailable = false;

  try {
    const rentData = await getCachedRentDashboardData(sidoFilter);
    jeonseItems = rentData.jeonseItems;
    wolseItems = rentData.wolseItems;
  } catch (error) {
    dataUnavailable = isDatabaseResourceLimitError(error);
    logDatabaseFailure("Rent page query failed", error, {
      route: "/rent",
      sido: sidoFilter ?? null,
    });
  }

  // 시도 목록 (필터 버튼용)
  const sidoList = getRentSidoFilters();

  const allRentItems = [...jeonseItems, ...wolseItems];
  const latestDate = latestRentTradeDate(allRentItems);
  const regionCount = uniqueRentRegionCount(allRentItems);
  const topDeposit = maxRentDeposit(jeonseItems);
  const topMonthlyRent = maxMonthlyRent(wolseItems);
  const rentEmptyState = rateRentEmptyStateCopy("rent", dataUnavailable);
  const jeonseEmptyState = rateRentEmptyStateCopy("jeonse", dataUnavailable);
  const wolseEmptyState = rateRentEmptyStateCopy("wolse", dataUnavailable);
  const basisLabel = latestDate
    ? `${latestDate} 기준 전월세 ${allRentItems.length.toLocaleString()}건`
    : rentEmptyState.basisLabel;

  return (
    <div>
      <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, { name: "전월세", href: "/rent" }]} />
      <DatasetJsonLd
        name="돈줍 전국 아파트 전월세 실거래 데이터셋"
        description="국토교통부 전월세 실거래가 기반 전국 아파트 전세 보증금, 월세, 거래일, 면적 정보를 요약한 공개 데이터셋입니다."
        url="https://donjup.com/rent"
        keywords={["아파트 전세", "아파트 월세", "전월세 실거래가", "전세가율"]}
        temporalCoverage={latestDate}
      />
      <SignalLandingHeader
        eyebrow="Rent signal"
        title="전국 아파트 전월세 실거래가"
        description="전세 보증금이 높은 단지와 최근 월세 거래를 함께 정리했습니다. 매매가를 보기 전, 전세·월세 부담과 임차 수요 신호를 같이 확인하세요."
        basisLabel={basisLabel}
        tone="neutral"
        eventScope="rent"
        primaryHref="/search"
        primaryLabel="내 단지 검색"
        secondaryHref="/rate"
        secondaryLabel="금리 같이 보기"
        stats={[
          {
            label: "전세 TOP",
            value: `${jeonseItems.length.toLocaleString()}건`,
            hint: "보증금 높은순",
          },
          {
            label: "최근 월세",
            value: `${wolseItems.length.toLocaleString()}건`,
            hint: "거래일 최신순",
          },
          {
            label: "최고 전세",
            value: topDeposit ? formatPrice(topDeposit) : "-",
            hint: "현재 목록 내 최대 보증금",
          },
          {
            label: "최고 월세",
            value: topMonthlyRent ? `${topMonthlyRent.toLocaleString()}만` : "-",
            hint: `${regionCount.toLocaleString()}개 지역 포착`,
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">

      {/* 시도 필터 */}
      <section className="mb-6">
        <div className="flex flex-wrap gap-2">
          <TrackedLink
            href="/rent"
            ctaName="rent_region_filter_click"
            params={{ sido: "all" }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              !sidoFilter
                ? "bg-brand-600 text-white"
                : "t-elevated t-text-secondary hover:bg-[var(--color-surface-elevated)]"
            }`}
          >
            전체
          </TrackedLink>
          {sidoList.map((s) => (
            <TrackedLink
              key={s.slug}
              href={`/rent?sido=${s.slug}`}
              ctaName="rent_region_filter_click"
              params={{ sido: s.slug }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                sidoFilter === s.slug
                  ? "bg-brand-600 text-white"
                  : "t-elevated t-text-secondary hover:bg-[var(--color-surface-elevated)]"
              }`}
            >
              {s.shortName}
            </TrackedLink>
          ))}
        </div>
      </section>

      {/* 전세 TOP */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="rank-badge rank-badge-rise text-[11px]">전세</span>
          <h2 className="text-lg font-bold t-text">전세 TOP</h2>
          <span className="text-xs t-text-tertiary">보증금 높은순 (고가 전세)</span>
        </div>

        {jeonseItems.length === 0 ? (
          <div className="rounded-xl border t-border t-card px-4 py-8 text-center">
            <p className="text-sm font-semibold t-text-secondary">{jeonseEmptyState.title}</p>
            <p className="mt-1 text-xs t-text-tertiary">{jeonseEmptyState.description}</p>
            {dataUnavailable && (
              <TrackedLink
                href={sidoFilter ? `/rent?sido=${sidoFilter}` : "/rent"}
                ctaName="rent_jeonse_unavailable_retry_click"
                className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                다시 시도
              </TrackedLink>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">보증금</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">거래일</th>
                </tr>
              </thead>
              <tbody>
                {jeonseItems.map((item, i) => {
                  const sizeSqm = Number(item.size_sqm ?? 0);
                  const deposit = Number(item.deposit ?? 0);
                  const detailHref = aptUrl({ govtComplexId: item.govt_complex_id, regionCode: item.region_code, slug: item.complex_slug ?? "" });

                  return (
                    <tr
                      key={`jeonse-${i}`}
                      className="transition hover:bg-[var(--color-surface-elevated)]"
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 tabular-nums t-text-tertiary">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <TrackedLink
                          href={detailHref}
                          ctaName="rent_transaction_to_detail"
                          params={{
                            rent_type: "jeonse",
                            rank: i + 1,
                            region_code: item.region_code,
                            trade_date: String(item.trade_date ?? ""),
                            deposit,
                          }}
                          className="font-semibold t-text hover:text-brand-600 transition"
                        >
                          {item.apt_name}
                        </TrackedLink>
                      </td>
                      <td className="px-4 py-3 t-text-secondary">
                        {String(item.region_name ?? "")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                        {formatArea(sizeSqm)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums t-rise">
                        {formatPrice(deposit)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full t-rise-bg px-2 py-0.5 text-xs font-medium t-rise">
                          전세
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums t-text-tertiary">
                        {String(item.trade_date ?? "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdSlot slotId="rent-infeed" format="infeed" className="my-6" />

      {/* 월세 TOP */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="rank-badge rank-badge-gold text-[11px]">월세</span>
          <h2 className="text-lg font-bold t-text">월세 TOP</h2>
          <span className="text-xs t-text-tertiary">최근 월세 거래</span>
        </div>

        {wolseItems.length === 0 ? (
          <div className="rounded-xl border t-border t-card px-4 py-8 text-center">
            <p className="text-sm font-semibold t-text-secondary">{wolseEmptyState.title}</p>
            <p className="mt-1 text-xs t-text-tertiary">{wolseEmptyState.description}</p>
            {dataUnavailable && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <TrackedLink
                  href={sidoFilter ? `/rent?sido=${sidoFilter}` : "/rent"}
                  ctaName="rent_wolse_unavailable_retry_click"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
                >
                  다시 시도
                </TrackedLink>
                <TrackedLink
                  href="/rate"
                  ctaName="rent_unavailable_rate_click"
                  className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
                >
                  금리 같이 보기
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
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">보증금</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">월세</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">거래일</th>
                </tr>
              </thead>
              <tbody>
                {wolseItems.map((item, i) => {
                  const detailHref = aptUrl({ govtComplexId: item.govt_complex_id, regionCode: item.region_code, slug: item.complex_slug ?? "" });
                  const deposit = Number(item.deposit ?? 0);
                  const monthlyRent = Number(item.monthly_rent ?? 0);
                  return (
                    <tr
                      key={`wolse-${i}`}
                      className="transition hover:bg-[var(--color-surface-elevated)]"
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 tabular-nums t-text-tertiary">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <TrackedLink
                          href={detailHref}
                          ctaName="rent_transaction_to_detail"
                          params={{
                            rent_type: "wolse",
                            rank: i + 1,
                            region_code: item.region_code,
                            trade_date: String(item.trade_date ?? ""),
                            deposit,
                            monthly_rent: monthlyRent,
                          }}
                          className="font-semibold t-text hover:text-brand-600 transition"
                        >
                          {item.apt_name}
                        </TrackedLink>
                      </td>
                      <td className="px-4 py-3 t-text-secondary">
                        {item.region_name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                        {formatArea(Number(item.size_sqm))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold t-text">
                        {formatPrice(deposit)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums gold-text">
                        {monthlyRent.toLocaleString()}만
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full gold-badge-bg px-2 py-0.5 text-xs font-medium gold-text">
                          월세
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums t-text-tertiary">
                        {String(item.trade_date ?? "")}
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
          eventScope="rent"
          methodTitle="전월세 데이터 기준"
          methodItems={[
            "전세 목록은 보증금이 높은 거래를 우선 보여주며, 월세 목록은 최근 거래일 순으로 정렬합니다.",
            "보증금과 월세는 국토교통부 전월세 실거래 공개 데이터를 기준으로 표시합니다.",
            "지역 필터는 시도 단위로 적용되며, 상세 페이지에서 매매 거래와 함께 비교할 수 있습니다.",
            "전세·월세 부담은 금리와 함께 봐야 하므로 금리 현황과 계산기 링크를 함께 제공합니다.",
          ]}
          relatedLinks={[
            {
              href: "/rate",
              title: "대출 금리",
              description: "전세 대출과 월세 전환 부담을 금리 흐름과 함께 봅니다.",
            },
            {
              href: "/today",
              title: "오늘의 실거래가",
              description: "전월세와 매매 실거래 신호를 같이 비교합니다.",
            },
            {
              href: "/search",
              title: "단지 검색",
              description: "관심 단지의 매매, 전세, 월세 거래를 상세에서 확인합니다.",
            },
            {
              href: "/daily/archive",
              title: "데일리 리포트",
              description: "날짜별 거래와 금리 요약을 다시 확인합니다.",
            },
          ]}
        />
      </div>
    </div>
  );
}
