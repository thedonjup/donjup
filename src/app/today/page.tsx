import type { Metadata } from "next";
import { formatPrice, sqmToPyeong, formatRegion } from "@/lib/format";
import { aptUrl } from "@/lib/apt-url";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { DROP_LEVEL_CONFIG } from "@/lib/constants/drop-level";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import TrackedLink from "@/components/analytics/TrackedLink";
import {
  latestTradeDate,
  maxTradePrice,
  signalEmptyStateCopy,
  strongestDropRate,
  uniqueRegionCount,
} from "@/lib/signal-landing";
import {
  isDatabaseResourceLimitError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  parsePropertyTypeParam,
  type TodayTransaction,
} from "@/lib/transaction-signal-data";
import { getCachedTodayTransactions } from "@/lib/transaction-signal-query";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "오늘의 아파트 실거래가 | 하락·최신 거래 신호",
  description:
    "전국 아파트 최신 실거래가를 거래일, 가격, 최고가 대비 변동률과 함께 확인하세요. 하락 신호와 직거래 여부까지 한 번에 볼 수 있습니다.",
  keywords: ["오늘 아파트 거래", "아파트 실거래가", "아파트 하락 거래", "부동산 거래", "최신 실거래가"],
  alternates: { canonical: "/today" },
  openGraph: {
    title: "오늘의 아파트 실거래가 | 돈줍",
    description: "최신 아파트 실거래가와 하락 신호를 매일 확인하세요.",
    url: "https://donjup.com/today",
    siteName: "돈줍 DonJup",
    images: [{ url: "https://donjup.com/today/opengraph-image", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "오늘의 아파트 실거래가 | 돈줍",
    description: "최신 아파트 실거래가와 하락 신호를 매일 확인하세요.",
    images: ["https://donjup.com/today/opengraph-image"],
  },
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const validType = parsePropertyTypeParam(typeParam);

  let transactions: TodayTransaction[] = [];
  let dataUnavailable = false;

  try {
    transactions = await getCachedTodayTransactions(validType);
  } catch (e) {
    dataUnavailable = true;
    logDatabaseFailure("Today page query failed", e, {
      route: "/today",
      resourceLimit: isDatabaseResourceLimitError(e),
    });
  }

  const latestDate = latestTradeDate(transactions);
  const regionCount = uniqueRegionCount(transactions);
  const topPrice = maxTradePrice(transactions);
  const topDrop = strongestDropRate(transactions);
  const emptyState = signalEmptyStateCopy("today", dataUnavailable);
  const basisLabel = latestDate
    ? `${latestDate} 기준 최신 실거래 ${transactions.length.toLocaleString()}건`
    : emptyState.basisLabel;

  return (
    <div>
      <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, { name: "오늘의 거래", href: "/today" }]} />
      {transactions.length > 0 && (
        <ItemListJsonLd
          name="오늘의 아파트 거래 랭킹"
          items={transactions.slice(0, 10).map((tx, i) => ({
            name: `${tx.apt_name} (${formatRegion(tx.region_code)})`,
            url: `https://donjup.com${aptUrl({ govtComplexId: tx.govt_complex_id, regionCode: tx.region_code, slug: tx.complex_slug ?? '' })}`,
            position: i + 1,
          }))}
        />
      )}
      <SignalLandingHeader
        eyebrow="Latest transaction signal"
        title="오늘의 아파트 실거래가"
        description="전국 아파트 최신 거래를 가격, 지역, 면적, 거래유형과 함께 정리했습니다. 하락률과 직거래 여부를 같이 보면서 오늘 확인할 단지를 빠르게 골라보세요."
        basisLabel={basisLabel}
        tone="drop"
        eventScope="today"
        primaryHref="/search"
        primaryLabel="내 단지 검색"
        secondaryHref="/new-highs"
        secondaryLabel="신고가 보기"
        stats={[
          {
            label: "표시 거래",
            value: `${transactions.length.toLocaleString()}건`,
            hint: "최근 거래일과 거래가 기준 정렬",
          },
          {
            label: "포착 지역",
            value: `${regionCount.toLocaleString()}곳`,
            hint: "시군구 코드 기준",
          },
          {
            label: "최대 거래가",
            value: topPrice ? formatPrice(topPrice) : "-",
            hint: "현재 목록 내 최고 거래가",
          },
          {
            label: "최대 하락률",
            value: topDrop !== null ? `${Math.abs(topDrop)}%` : "-",
            hint: "최고가 대비 음수 변동률 기준",
          },
        ]}
      />
      <PropertyTypeFilter currentType={validType} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
            <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
              오늘의 거래
            </h1>
          </div>
          <p className="mt-2 text-sm t-text-secondary">
            가장 최근 체결된 실거래 내역입니다. 거래일 및 거래가 순으로 정렬됩니다.
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
                const dropCfg = tx.drop_level ? DROP_LEVEL_CONFIG[tx.drop_level] : null;
                const detailHref = aptUrl({ govtComplexId: tx.govt_complex_id, regionCode: tx.region_code, slug: tx.complex_slug ?? "" });
                return (
                  <TrackedLink
                    key={tx.id}
                    href={detailHref}
                    ctaName="today_transaction_to_detail"
                    params={{
                      surface: "mobile_card",
                      rank: i + 1,
                      region_code: tx.region_code,
                      trade_date: tx.trade_date,
                      trade_price: tx.trade_price,
                      change_rate: tx.change_rate ?? undefined,
                    }}
                    className="card-hover block rounded-xl border t-border t-card px-4 py-3.5"
                    style={{ WebkitTapHighlightColor: "transparent", minHeight: 64 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold t-text" style={{ lineHeight: "1.4" }}>
                          {tx.apt_name}
                        </p>
                        <p className="mt-0.5 text-xs t-text-tertiary" style={{ lineHeight: "1.4" }}>
                          {formatRegion(tx.region_code)} · {Math.round(sqmToPyeong(tx.size_sqm))}평{tx.floor != null ? ` · ${tx.floor}층` : ""}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums t-text">
                          {formatPrice(tx.trade_price)}
                        </p>
                        <div className="mt-0.5 flex items-center justify-end gap-1">
                          {tx.change_rate != null ? (
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                tx.change_rate < 0 ? "t-drop" : tx.change_rate > 0 ? "t-rise" : "t-text-tertiary"
                              }`}
                            >
                              {tx.change_rate < 0 ? "▼" : tx.change_rate > 0 ? "▲" : ""}
                              {tx.change_rate !== 0 ? ` ${Math.abs(tx.change_rate)}%` : "0%"}
                            </span>
                          ) : (
                            <span className="text-xs t-text-tertiary">-</span>
                          )}
                          {dropCfg && (
                            <span
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: dropCfg.bg, color: dropCfg.color }}
                            >
                              {dropCfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px] t-text-tertiary">{tx.trade_date}</span>
                      {tx.deal_type === "직거래" ? (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" }}>
                          직거래
                        </span>
                      ) : tx.deal_type ? (
                        <span className="text-[11px] t-text-tertiary">
                          {tx.deal_type === "중개거래" ? "중개" : tx.deal_type}
                        </span>
                      ) : null}
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
                    <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">층</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래가</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">변동률</th>
                    <th className="px-4 py-3 text-center text-xs font-medium t-text-tertiary">거래유형</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => {
                    const dropCfg = tx.drop_level ? DROP_LEVEL_CONFIG[tx.drop_level] : null;
                    const detailHref = aptUrl({ govtComplexId: tx.govt_complex_id, regionCode: tx.region_code, slug: tx.complex_slug ?? "" });
                    return (
                      <tr
                        key={tx.id}
                        className="transition hover:bg-[var(--color-surface-elevated)]"
                        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                      >
                        <td className="px-4 py-3">
                          <TrackedLink
                            href={detailHref}
                            ctaName="today_transaction_to_detail"
                            params={{
                              surface: "desktop_table",
                              rank: i + 1,
                              region_code: tx.region_code,
                              trade_date: tx.trade_date,
                              trade_price: tx.trade_price,
                              change_rate: tx.change_rate ?? undefined,
                            }}
                            className="font-semibold t-text hover:text-brand-600 transition"
                          >
                            {tx.apt_name}
                          </TrackedLink>
                          <p className="mt-0.5 text-[11px] t-text-tertiary">{tx.trade_date}</p>
                        </td>
                        <td className="px-4 py-3 text-sm t-text-secondary">{formatRegion(tx.region_code)}</td>
                        <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                          {Math.round(sqmToPyeong(tx.size_sqm))}평
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                          {tx.floor != null ? `${tx.floor}층` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums t-text">
                          {formatPrice(tx.trade_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tx.change_rate != null ? (
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  tx.change_rate < 0 ? "t-drop" : tx.change_rate > 0 ? "t-rise" : "t-text-tertiary"
                                }`}
                              >
                                {tx.change_rate < 0 ? "▼" : tx.change_rate > 0 ? "▲" : ""}
                                {tx.change_rate !== 0 ? ` ${Math.abs(tx.change_rate)}%` : "0%"}
                              </span>
                            ) : (
                              <span className="text-xs t-text-tertiary">-</span>
                            )}
                            {dropCfg && (
                              <span
                                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ backgroundColor: dropCfg.bg, color: dropCfg.color }}
                              >
                                {dropCfg.label}
                              </span>
                            )}
                          </div>
                        </td>
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
                  href="/today"
                  ctaName="today_unavailable_retry_click"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
                >
                  다시 시도
                </TrackedLink>
                <TrackedLink
                  href="/search"
                  ctaName="today_unavailable_search_click"
                  className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
                >
                  단지 검색
                </TrackedLink>
              </div>
            )}
          </div>
        )}

        <SignalLandingFooter
          eventScope="today"
          methodTitle="오늘의 거래 데이터 기준"
          methodItems={[
            "국토교통부 실거래가 공개 이후 수집된 아파트 거래를 최신 거래일 순으로 보여줍니다.",
            "하락률은 저장된 최고가 대비 현재 거래가의 변동률을 기준으로 표시합니다.",
            "직거래는 가격 왜곡 가능성이 있어 별도 배지로 표시합니다.",
            "단지 상세에서는 면적별 가격 추이, 전월세, 주변 단지 비교를 이어서 볼 수 있습니다.",
          ]}
          relatedLinks={[
            {
              href: "/new-highs",
              title: "오늘의 신고가",
              description: "하락 신호와 반대로 최고가를 갱신한 단지를 확인합니다.",
            },
            {
              href: "/rate",
              title: "대출 금리",
              description: "거래가를 본 뒤 월 상환 부담까지 같이 계산합니다.",
            },
            {
              href: "/map",
              title: "지도에서 보기",
              description: "지역별 거래 신호를 지도 흐름으로 훑어봅니다.",
            },
            {
              href: "/daily/archive",
              title: "데일리 리포트",
              description: "날짜별 하락·신고가·금리 요약을 다시 봅니다.",
            },
          ]}
        />
      </div>
    </div>
  );
}
