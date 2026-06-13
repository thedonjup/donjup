import type { Metadata } from "next";
import { formatPrice, sqmToPyeong, formatRegion } from "@/lib/format";
import { aptUrl } from "@/lib/apt-url";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import TrackedLink from "@/components/analytics/TrackedLink";
import {
  latestTradeDate,
  maxTradePrice,
  signalEmptyStateCopy,
  uniqueRegionCount,
} from "@/lib/signal-landing";
import {
  isDatabaseResourceLimitError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  parsePropertyTypeParam,
  type NewHighTransaction,
} from "@/lib/transaction-signal-data";
import { getCachedNewHighTransactions } from "@/lib/transaction-signal-query";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "오늘의 아파트 신고가 | 최고가 경신 거래",
  description:
    "전국 아파트 신고가 거래를 최신순으로 확인하세요. 최고가를 경신한 단지의 지역, 면적, 거래가, 거래유형을 한눈에 볼 수 있습니다.",
  keywords: ["아파트 신고가", "부동산 신고가", "실거래가 최고가", "아파트 시세", "오늘 신고가"],
  alternates: { canonical: "/new-highs" },
  openGraph: {
    title: "오늘의 아파트 신고가 | 돈줍",
    description: "전국 아파트 신고가 거래와 최고가 경신 단지를 매일 확인하세요.",
    url: "https://donjup.com/new-highs",
    siteName: "돈줍 DonJup",
    images: [{ url: "https://donjup.com/new-highs/opengraph-image", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "오늘의 아파트 신고가 | 돈줍",
    description: "전국 아파트 신고가 거래와 최고가 경신 단지를 매일 확인하세요.",
    images: ["https://donjup.com/new-highs/opengraph-image"],
  },
};

export default async function NewHighsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const validType = parsePropertyTypeParam(typeParam);

  let transactions: NewHighTransaction[] = [];
  let dataUnavailable = false;

  try {
    transactions = await getCachedNewHighTransactions(validType);
  } catch (e) {
    dataUnavailable = true;
    logDatabaseFailure("New highs page query failed", e, {
      route: "/new-highs",
      resourceLimit: isDatabaseResourceLimitError(e),
    });
  }

  const latestDate = latestTradeDate(transactions);
  const regionCount = uniqueRegionCount(transactions);
  const topPrice = maxTradePrice(transactions);
  const directDealCount = transactions.filter((tx) => tx.deal_type === "직거래").length;
  const emptyState = signalEmptyStateCopy("new-highs", dataUnavailable);
  const basisLabel = latestDate
    ? `${latestDate} 기준 신고가 ${transactions.length.toLocaleString()}건`
    : emptyState.basisLabel;

  return (
    <div>
      <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, { name: "오늘의 신고가", href: "/new-highs" }]} />
      {transactions.length > 0 && (
        <ItemListJsonLd
          name="오늘의 아파트 신고가 랭킹"
          items={transactions.slice(0, 10).map((tx, i) => ({
            name: `${tx.apt_name} (${formatRegion(tx.region_code)})`,
            url: `https://donjup.com${aptUrl({ govtComplexId: tx.govt_complex_id, regionCode: tx.region_code, slug: tx.complex_slug ?? '' })}`,
            position: i + 1,
          }))}
        />
      )}
      <SignalLandingHeader
        eyebrow="New high signal"
        title="오늘의 아파트 신고가"
        description="최고가를 새로 쓴 거래만 모아 최신순으로 정리했습니다. 하락 거래와 함께 보면 어느 지역에 온기가 남아 있는지 더 빠르게 판단할 수 있습니다."
        basisLabel={basisLabel}
        tone="rise"
        eventScope="new_highs"
        primaryHref="/today"
        primaryLabel="하락 거래 같이 보기"
        secondaryHref="/search"
        secondaryLabel="내 단지 검색"
        stats={[
          {
            label: "신고가 거래",
            value: `${transactions.length.toLocaleString()}건`,
            hint: "현재 목록 내 최고가 경신 거래",
          },
          {
            label: "포착 지역",
            value: `${regionCount.toLocaleString()}곳`,
            hint: "시군구 코드 기준",
          },
          {
            label: "최고 거래가",
            value: topPrice ? formatPrice(topPrice) : "-",
            hint: "현재 목록 내 최고 신고가",
          },
          {
            label: "직거래 포함",
            value: `${directDealCount.toLocaleString()}건`,
            hint: "가격 해석 시 별도 확인",
          },
        ]}
      />
      <PropertyTypeFilter currentType={validType} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
            <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
              오늘의 신고가
            </h1>
          </div>
          <p className="mt-2 text-sm t-text-secondary">
            역대 최고가를 경신한 실거래 내역입니다. 최신순으로 정렬됩니다.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs t-text-tertiary">
            <span>총 {transactions.length}건</span>
          </div>
        </section>

        {transactions.length > 0 ? (
          <>
            {/* Mobile: Card layout */}
            <div className="space-y-2 sm:hidden">
              {transactions.map((tx, i) => {
                const detailHref = aptUrl({ govtComplexId: tx.govt_complex_id, regionCode: tx.region_code, slug: tx.complex_slug ?? "" });
                return (
                  <TrackedLink
                    key={tx.id}
                    href={detailHref}
                    ctaName="new_highs_transaction_to_detail"
                    params={{
                      surface: "mobile_card",
                      rank: i + 1,
                      region_code: tx.region_code,
                      trade_date: tx.trade_date,
                      trade_price: tx.trade_price,
                    }}
                    className="card-hover block rounded-xl border t-border t-card px-4 py-3.5"
                    style={{ WebkitTapHighlightColor: "transparent", minHeight: 64 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="rank-badge rank-badge-rise text-[11px] shrink-0">{i + 1}</span>
                        <p className="truncate text-sm font-semibold t-text" style={{ lineHeight: "1.4" }}>
                          {tx.apt_name}
                        </p>
                      </div>
                      <p className="text-sm font-bold tabular-nums t-rise shrink-0">
                        {formatPrice(tx.trade_price)}
                      </p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 pl-7">
                      <span className="text-xs t-text-tertiary">
                        {formatRegion(tx.region_code)} · {Math.round(sqmToPyeong(tx.size_sqm))}평 · {tx.trade_date}
                      </span>
                      {tx.deal_type === "직거래" && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" }}>
                          직거래
                        </span>
                      )}
                    </div>
                  </TrackedLink>
                );
              })}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">순위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래가</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium t-text-tertiary">거래유형</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => {
                  const detailHref = aptUrl({ govtComplexId: tx.govt_complex_id, regionCode: tx.region_code, slug: tx.complex_slug ?? "" });
                  return (
                    <tr
                      key={tx.id}
                      className="transition hover:bg-[var(--color-surface-elevated)]"
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3">
                        <span className="rank-badge rank-badge-rise text-[11px]">{i + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <TrackedLink
                          href={detailHref}
                          ctaName="new_highs_transaction_to_detail"
                          params={{
                            surface: "desktop_table",
                            rank: i + 1,
                            region_code: tx.region_code,
                            trade_date: tx.trade_date,
                            trade_price: tx.trade_price,
                          }}
                          className="font-semibold t-text hover:text-brand-600 transition"
                        >
                          {tx.apt_name}
                        </TrackedLink>
                      </td>
                      <td className="px-4 py-3 text-sm t-text-secondary">{formatRegion(tx.region_code)}</td>
                      <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                        {Math.round(sqmToPyeong(tx.size_sqm))}평
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums t-rise">
                        {formatPrice(tx.trade_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs t-text-tertiary">{tx.trade_date}</td>
                      <td className="px-4 py-3 text-center">
                        {tx.deal_type === "직거래" ? (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" }}>
                            직거래
                          </span>
                        ) : (
                          <span className="text-xs t-text-tertiary">
                            {tx.deal_type === "중개거래" ? "중개" : tx.deal_type || "-"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed t-border p-10 text-center">
            <p className="text-sm font-semibold t-text-secondary">{emptyState.title}</p>
            <p className="mt-1 text-xs t-text-tertiary">
              {emptyState.description}
            </p>
            {dataUnavailable && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <TrackedLink
                  href="/new-highs"
                  ctaName="new_highs_unavailable_retry_click"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
                >
                  다시 시도
                </TrackedLink>
                <TrackedLink
                  href="/today"
                  ctaName="new_highs_unavailable_today_click"
                  className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
                >
                  최신 거래 보기
                </TrackedLink>
              </div>
            )}
          </div>
        )}

        <SignalLandingFooter
          eventScope="new_highs"
          methodTitle="신고가 데이터 기준"
          methodItems={[
            "저장된 거래 이력에서 최고가를 경신한 거래만 신고가로 분류합니다.",
            "목록은 최신 거래일 순으로 정렬하며, 동일 기간 내 거래가 높은 단지를 함께 확인할 수 있습니다.",
            "직거래는 가격 해석이 달라질 수 있어 배지로 별도 표시합니다.",
            "단지 상세에서는 과거 최고가, 최근 거래, 주변 단지와 함께 비교할 수 있습니다.",
          ]}
          relatedLinks={[
            {
              href: "/today",
              title: "오늘의 실거래가",
              description: "신고가와 반대편의 하락·최신 거래 신호를 같이 봅니다.",
            },
            {
              href: "/market",
              title: "지역별 시장",
              description: "신고가가 나온 지역의 전체 흐름을 확인합니다.",
            },
            {
              href: "/rate",
              title: "대출 금리",
              description: "신고가 거래가 실제 월 부담으로는 어느 정도인지 계산합니다.",
            },
            {
              href: "/daily/archive",
              title: "데일리 리포트",
              description: "날짜별 신고가와 하락 거래 요약을 다시 봅니다.",
            },
          ]}
        />
      </div>
    </div>
  );
}
