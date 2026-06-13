import type { Metadata } from "next";
import TrackedLink from "@/components/analytics/TrackedLink";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import {
  getCachedDailyReportArchivePage,
  type DailyReportArchiveItem,
} from "@/lib/daily-report-query";
import {
  countDailyReportSignals,
  dailyArchivePageLabel,
  formatDailyDateLabel,
  latestDailyReportDate,
  totalArchiveSignals,
} from "@/lib/daily-landing";
import { logDatabaseFailure } from "@/lib/db/logging";
import { pageOffset, parsePositivePage, type PageParam } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "데일리 리포트 아카이브",
  description: "돈줍 데일리 부동산 리포트 전체 목록. 매일 업데이트되는 폭락/신고가 분석.",
  alternates: { canonical: "/daily/archive" },
  openGraph: {
    title: "데일리 리포트 아카이브",
    description: "날짜별 아파트 하락, 신고가, 금리, 거래량 신호를 다시 확인하세요.",
    url: "/daily/archive",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "데일리 리포트 아카이브",
    description: "매일 쌓이는 돈줍 부동산 리포트를 날짜별로 확인하세요.",
  },
};

export const revalidate = 3600;

const PAGE_SIZE = 20;

export default async function DailyArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: PageParam }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = parsePositivePage(pageParam);
  const offset = pageOffset(currentPage, PAGE_SIZE);

  let reports: DailyReportArchiveItem[] = [];
  let count = 0;
  let loadError = false;

  try {
    const archivePage = await getCachedDailyReportArchivePage(currentPage, PAGE_SIZE);
    reports = archivePage.reports;
    count = archivePage.count;
  } catch (error) {
    loadError = true;
    logDatabaseFailure("Daily archive query failed", error, {
      route: "/daily/archive",
      page: currentPage,
    });
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);
  const latestDate = latestDailyReportDate(reports);
  const visibleSignalCount = totalArchiveSignals(reports);
  const pageLabel = dailyArchivePageLabel(currentPage, totalPages);

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "데일리 리포트", href: "/daily/archive" },
        ]}
      />
      <SignalLandingHeader
        eyebrow="데일리 리포트 허브"
        title="데일리 리포트 아카이브"
        description="날짜별로 쌓인 하락, 신고가, 금리, 거래량 신호를 다시 열어보고 관심 단지 탐색으로 이어가세요."
        basisLabel={latestDate ? `최신 리포트 ${formatDailyDateLabel(latestDate)}` : "리포트 준비 중"}
        stats={[
          {
            label: "전체 리포트",
            value: count ? `${count.toLocaleString()}개` : "-",
            hint: "날짜별 시장 신호 기록입니다",
          },
          {
            label: "현재 페이지",
            value: pageLabel,
            hint: `${PAGE_SIZE}개씩 확인합니다`,
          },
          {
            label: "표시 신호",
            value: `${visibleSignalCount.toLocaleString()}개`,
            hint: "현재 페이지 하락·신고가 합계입니다",
          },
          {
            label: "재진입 동선",
            value: "검색·계산",
            hint: "리포트에서 단지 상세와 계산기로 이어집니다",
          },
        ]}
        primaryHref={latestDate ? `/daily/${latestDate}` : "/today"}
        primaryLabel="최신 리포트 보기"
        secondaryHref="/today"
        secondaryLabel="오늘 거래 보기"
        eventScope="daily_archive"
        tone="neutral"
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold t-text">날짜별 리포트</h2>
            <p className="mt-1 text-sm t-text-secondary">
              오래된 리포트도 같은 기준으로 열어보고, 당시 신호가 나온 단지로 다시 들어갈 수 있습니다.
            </p>
          </div>
          <p className="text-xs font-semibold t-text-tertiary">
            {count ? `총 ${count.toLocaleString()}개` : "리포트 없음"}
          </p>
        </section>

        <div>
        {reports && reports.length > 0 ? (
          <div className="space-y-2">
            {reports.map((r, index) => {
              const signals = countDailyReportSignals(r);
              return (
              <TrackedLink
                key={r.id}
                href={`/daily/${r.report_date}`}
                ctaName="daily_archive_report_click"
                params={{
                  rank: offset + index + 1,
                  report_date: r.report_date,
                  drop_count: signals.dropCount,
                  high_count: signals.highCount,
                }}
                className="card-hover flex items-center gap-4 rounded-xl border px-5 py-4"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
              >
                {/* Date badge */}
                <div
                  className="flex-shrink-0 rounded-lg px-3 py-1.5 text-center"
                  style={{ background: "var(--color-surface-elevated)" }}
                >
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                    {r.report_date.slice(5, 7)}월
                  </p>
                  <p className="text-lg font-extrabold tabular-nums t-text">
                    {r.report_date.slice(8, 10)}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate t-text">{r.title}</p>
                  {r.summary && (
                    <p className="mt-0.5 text-sm truncate" style={{ color: "var(--color-text-secondary)" }}>
                      {r.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full t-drop-bg px-2 py-0.5 text-[11px] font-semibold t-drop">
                      하락 {signals.dropCount}건
                    </span>
                    <span className="rounded-full t-rise-bg px-2 py-0.5 text-[11px] font-semibold t-rise">
                      신고가 {signals.highCount}건
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ color: "var(--color-text-tertiary)" }}>&rarr;</span>
              </TrackedLink>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-2xl border-2 border-dashed p-12 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-xl"
              style={{ background: "var(--color-surface-elevated)" }}
            >
              📋
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {loadError ? "리포트를 불러오지 못했습니다." : "아직 생성된 리포트가 없습니다."}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {loadError ? "잠시 후 다시 확인해주세요." : "매일 자동으로 리포트가 생성됩니다."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <TrackedLink
                href="/today"
                ctaName="daily_archive_empty_today_click"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                오늘 거래 보기
              </TrackedLink>
              <TrackedLink
                href="/search"
                ctaName="daily_archive_empty_search_click"
                className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
              >
                단지 검색
              </TrackedLink>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {currentPage > 1 && (
              <TrackedLink
                href={`/daily/archive?page=${currentPage - 1}`}
                ctaName="daily_archive_pagination_click"
                params={{ page: currentPage - 1, direction: "previous" }}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-80"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                &larr; 이전
              </TrackedLink>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {showEllipsis && (
                      <span style={{ color: "var(--color-text-tertiary)" }}>…</span>
                    )}
                    <TrackedLink
                      href={`/daily/archive?page=${p}`}
                      ctaName="daily_archive_pagination_click"
                      params={{ page: p, direction: "number" }}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                        p === currentPage
                          ? "bg-brand-600 text-white"
                          : ""
                      }`}
                      style={
                        p !== currentPage
                          ? { color: "var(--color-text-secondary)" }
                          : undefined
                      }
                    >
                      {p}
                    </TrackedLink>
                  </span>
                );
              })}

            {currentPage < totalPages && (
              <TrackedLink
                href={`/daily/archive?page=${currentPage + 1}`}
                ctaName="daily_archive_pagination_click"
                params={{ page: currentPage + 1, direction: "next" }}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-80"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                다음 &rarr;
              </TrackedLink>
            )}
          </div>
        )}
      </div>

        <SignalLandingFooter
          eventScope="daily_archive"
          methodTitle="데일리 리포트 기준"
          methodItems={[
            "데일리 리포트는 해당 날짜에 포착된 하락, 신고가, 금리, 거래량 신호를 묶어 보여줍니다.",
            "아카이브 목록은 최신 리포트부터 정렬하고 페이지 단위로 나눕니다.",
            "각 리포트에서 단지명을 누르면 상세 실거래가 화면으로 이어집니다.",
            "리포트는 시장을 판단하기 위한 데이터 기록이며 투자 추천이 아닙니다.",
          ]}
          relatedLinks={[
            {
              href: "/today",
              title: "오늘 하락 거래",
              description: "가장 최신 하락 신호를 날짜 리포트 밖에서 바로 확인합니다.",
            },
            {
              href: "/new-highs",
              title: "오늘 신고가",
              description: "신고가가 나온 단지를 별도로 모아봅니다.",
            },
            {
              href: "/trend",
              title: "시장 트렌드",
              description: "날짜별 기록을 최근 6개월 거래량 흐름과 함께 봅니다.",
            },
            {
              href: "/rate",
              title: "대출 금리",
              description: "리포트 속 가격 신호를 금리 부담과 같이 해석합니다.",
            },
          ]}
        />
      </div>
    </div>
  );
}
