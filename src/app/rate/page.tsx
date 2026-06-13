import type { Metadata } from "next";
import AdSlot from "@/components/ads/AdSlot";
import { RATE_LABELS, RATE_DESCRIPTIONS, RATE_ORDER } from "@/lib/format";
import { FaqJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import type { FinanceRate } from "@/types/db";
import RateIndicatorAccordion from "@/components/rate/RateIndicatorAccordion";
import type { IndicatorItem } from "@/components/rate/RateIndicatorAccordion";
import BankRateExpandable from "@/components/rate/BankRateExpandable";
import type { BankRateItem } from "@/components/rate/BankRateExpandable";
import SignalLandingHeader from "@/components/landing/SignalLandingHeader";
import SignalLandingFooter from "@/components/landing/SignalLandingFooter";
import TrackedLink from "@/components/analytics/TrackedLink";
import {
  averageChangeBp,
  averageRateValue,
  latestBaseDate,
  rateRentEmptyStateCopy,
  rateValueRange,
} from "@/lib/rate-rent-landing";
import {
  isDatabaseResourceLimitError,
} from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { isDisplayBankRateType } from "@/lib/rate-dashboard-data";
import { getCachedRateDashboardRates } from "@/lib/rate-dashboard-query";

export const metadata: Metadata = {
  title: "주택담보대출 금리 현황 | 기준금리·COFIX·은행별 금리",
  description: "한국은행 기준금리, COFIX, CD금리, 국고채, 은행별 주택담보대출 금리를 한 번에 확인하고 대출 이자 계산기로 월 상환액을 계산하세요.",
  keywords: ["주택담보대출 금리", "COFIX 금리", "기준금리", "대출 이자 계산기", "은행별 주담대 금리"],
  alternates: { canonical: "/rate" },
  openGraph: {
    title: "주택담보대출 금리 현황 | 돈줍",
    description: "기준금리, COFIX, 은행별 주담대 금리와 월 상환 부담을 확인하세요.",
    url: "https://donjup.com/rate",
    siteName: "돈줍 DonJup",
    images: [{ url: "https://donjup.com/rate/opengraph-image", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "주택담보대출 금리 현황 | 돈줍",
    description: "기준금리, COFIX, 은행별 주담대 금리와 월 상환 부담을 확인하세요.",
    images: ["https://donjup.com/rate/opengraph-image"],
  },
};

export const dynamic = "force-dynamic";

/** 은행 코드 → 한글명 매핑 */
const BANK_LABELS: Record<string, string> = {
  BANK_KB: "KB국민은행",
  BANK_SHINHAN: "신한은행",
  BANK_WOORI: "우리은행",
  BANK_HANA: "하나은행",
  BANK_NH: "NH농협은행",
  BANK_IBK: "IBK기업은행",
  BANK_KAKAO: "카카오뱅크",
  BANK_KBANK: "케이뱅크",
  BANK_TOSS: "토스뱅크",
  BANK_SC: "SC제일은행",
  BANK_CITI: "한국씨티은행",
  BANK_BUSAN: "부산은행",
  BANK_DAEGU: "대구은행",
  BANK_GWANGJU: "광주은행",
  BANK_JEONBUK: "전북은행",
  BANK_GYEONGNAM: "경남은행",
  BANK_JEJU: "제주은행",
  BANK_SUHYUP: "수협은행",
  BANK_UNKNOWN: "기타",
};

export default async function RateDashboardPage() {
  let allRates: FinanceRate[] = [];
  let dataUnavailable = false;

  try {
    allRates = await getCachedRateDashboardRates();
  } catch (error) {
    dataUnavailable = isDatabaseResourceLimitError(error);
    logDatabaseFailure("Rate page query failed", error, {
      route: "/rate",
    });
  }

  // 은행별 최신 금리만 추출
  const bankRates = new Map<string, {
    rate_type: string;
    rate_value: number;
    prev_value: number | null;
    change_bp: number | null;
    base_date: string;
  }>();
  for (const r of allRates) {
    if (!isDisplayBankRateType(r.rate_type)) {
      continue;
    }

    if (!bankRates.has(r.rate_type)) {
      bankRates.set(r.rate_type, { ...r, base_date: String(r.base_date ?? "") });
    }
  }
  const sortedBankRates = Array.from(bankRates.values()).sort(
    (a, b) => a.rate_value - b.rate_value
  );

  const latestByType = new Map<string, {
    rate_type: string;
    rate_value: number;
    prev_value: number | null;
    change_bp: number | null;
    base_date: string;
  }>();

  const historyByType = new Map<string, Array<{ date: string; value: number }>>();

  for (const r of allRates) {
    const baseDateStr = String(r.base_date ?? "");
    if (!latestByType.has(r.rate_type)) {
      latestByType.set(r.rate_type, { ...r, base_date: baseDateStr });
    }
    const history = historyByType.get(r.rate_type) ?? [];
    history.push({ date: baseDateStr, value: r.rate_value });
    historyByType.set(r.rate_type, history);
  }

  const hasData = latestByType.size > 0;

  // Hero card computation — filter out BANK_UNKNOWN per D-02
  const validBanks = sortedBankRates.filter(r => r.rate_type !== "BANK_UNKNOWN");
  const avgRate = averageRateValue(validBanks);
  const rateRange = rateValueRange(validBanks);
  const minRate = rateRange?.min ?? null;
  const maxRate = rateRange?.max ?? null;
  const heroBaseDate = latestBaseDate(validBanks) ?? "";
  const avgChangeBp = averageChangeBp(validBanks);

  // Props for RateIndicatorAccordion
  const indicators: IndicatorItem[] = RATE_ORDER.map((type) => {
    const rate = latestByType.get(type);
    return {
      type,
      label: RATE_LABELS[type] ?? type,
      description: RATE_DESCRIPTIONS[type] ?? "",
      rateValue: rate?.rate_value ?? null,
      prevValue: rate?.prev_value ?? null,
      changeBp: rate?.change_bp ?? null,
      baseDate: String(rate?.base_date ?? ""),
      history: (historyByType.get(type) ?? []).slice().reverse().slice(-12).map(h => ({ value: h.value })),
    };
  });

  // Props for BankRateExpandable
  const bankItems: BankRateItem[] = sortedBankRates.map(b => ({
    rate_type: b.rate_type,
    label: BANK_LABELS[b.rate_type] ?? b.rate_type.replace(/^BANK_/, "").replace(/_/g, " "),
    rate_value: b.rate_value,
    prev_value: b.prev_value,
    change_bp: b.change_bp,
    base_date: b.base_date,
  }));

  const indicatorCount = indicators.filter((indicator) => indicator.rateValue !== null).length;
  const emptyState = rateRentEmptyStateCopy("rate", dataUnavailable);
  const basisLabel = heroBaseDate
    ? `${heroBaseDate} 기준 은행 금리 ${validBanks.length.toLocaleString()}개`
    : emptyState.basisLabel;

  return (
    <div>
      <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, { name: "금리 현황", href: "/rate" }]} />
      <FaqJsonLd
        items={[
          {
            question: "현재 한국은행 기준금리는 얼마인가요?",
            answer:
              "한국은행 기준금리는 금통위 회의 결과에 따라 변동됩니다. 돈줍 금리 현황 페이지에서 최신 기준금리와 변동 추이를 실시간으로 확인하실 수 있습니다.",
          },
          {
            question: "COFIX 금리란 무엇인가요?",
            answer:
              "COFIX(Cost of Funds Index)는 은행의 자금 조달 비용을 반영한 기준금리로, 주택담보대출 변동금리의 기준이 됩니다. 신규취급액 기준과 잔액 기준이 있습니다.",
          },
          {
            question: "주담대 금리를 가장 낮게 받으려면 어떻게 해야 하나요?",
            answer:
              "은행별로 금리 우대 조건이 다르므로, 돈줍의 은행별 금리 비교 기능을 활용하여 최저금리 은행을 확인하고, 급여이체, 카드 사용 등 우대 조건을 충족하는 것이 좋습니다.",
          },
        ]}
      />
      <SignalLandingHeader
        eyebrow="Loan rate signal"
        title="주택담보대출 금리 현황"
        description="기준금리, COFIX, CD금리, 국고채와 은행별 주담대 금리를 함께 정리했습니다. 거래가를 본 뒤 월 상환 부담까지 이어서 계산해보세요."
        basisLabel={basisLabel}
        tone="rate"
        eventScope="rate"
        primaryHref="/rate/calculator"
        primaryLabel="대출 이자 계산"
        secondaryHref="/today"
        secondaryLabel="오늘 거래 보기"
        stats={[
          {
            label: "시중 평균",
            value: avgRate !== null ? `${avgRate}%` : "-",
            hint: "BANK_UNKNOWN 제외 평균",
          },
          {
            label: "최저~최고",
            value: minRate !== null && maxRate !== null ? `${minRate}% ~ ${maxRate}%` : "-",
            hint: "은행별 최신 주담대 금리",
          },
          {
            label: "평균 변동",
            value: avgChangeBp !== null ? `${avgChangeBp > 0 ? "+" : ""}${avgChangeBp}bp` : "-",
            hint: "은행별 변동폭 평균",
          },
          {
            label: "주요 지표",
            value: `${indicatorCount.toLocaleString()}개`,
            hint: "기준금리, COFIX, CD, 국고채",
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">

      {hasData ? (
        <>
          {/* Hero card — D-01/D-03/D-04 */}
          {avgRate !== null && (
            <div className="rounded-2xl border-2 brand-tint-border brand-tint t-card p-6 mb-6">
              <p className="text-sm font-medium t-text-secondary">시중 주담대 평균금리</p>
              <div className="flex items-end gap-3 mt-2">
                <p className="text-5xl font-extrabold tabular-nums t-text">{avgRate}%</p>
                {avgChangeBp !== null && avgChangeBp !== 0 && (
                  <span className={`mb-1 inline-flex items-center rounded-full px-2 py-1 text-sm font-bold ${
                    avgChangeBp > 0 ? "t-drop-bg t-drop" : "t-rise-bg t-rise"
                  }`}>
                    {avgChangeBp > 0 ? "+" : ""}{avgChangeBp}bp
                  </span>
                )}
              </div>
              {minRate !== null && maxRate !== null && (
                <p className="mt-2 text-sm t-text-secondary">
                  은행 최저 {minRate}% ~ 최고 {maxRate}%
                </p>
              )}
              <p className="mt-1 text-xs t-text-tertiary">기준일: {heroBaseDate}</p>
            </div>
          )}

          {/* Accordion section — D-05/D-08 */}
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-bold t-text">주요 금리 지표</h2>
            <RateIndicatorAccordion indicators={indicators} />
          </section>

          <AdSlot slotId="rate-mid-banner" format="banner" />

          {/* Bank rates section — D-09 */}
          {bankItems.length > 0 && (
            <section className="mt-10">
              <BankRateExpandable banks={bankItems} sourceDate={sortedBankRates[0]?.base_date ?? ""} />
            </section>
          )}
        </>
      ) : (
        <div className="rounded-2xl border-2 border-dashed t-border p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl t-elevated text-xl">
            📊
          </div>
          <p className="mt-3 text-sm font-semibold t-text-secondary">{emptyState.title}</p>
          <p className="mt-1 text-xs t-text-tertiary">{emptyState.description}</p>
          {dataUnavailable && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <TrackedLink
                href="/rate"
                ctaName="rate_unavailable_retry_click"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                다시 시도
              </TrackedLink>
              <TrackedLink
                href="/rate/calculator"
                ctaName="rate_unavailable_calculator_click"
                className="rounded-lg border t-border px-4 py-2 text-sm font-bold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
              >
                계산기 열기
              </TrackedLink>
            </div>
          )}
        </div>
      )}

      {/* Calculator Tools */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold t-text">대출/부동산 도구</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <TrackedLink
            href="/rate/calculator"
            ctaName="rate_tool_click"
            params={{ tool: "loan" }}
            className="card-hover rounded-2xl border-2 brand-tint-border p-6 text-center t-card"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl brand-tint-icon-bg text-sm font-bold text-brand-600">
              %%
            </div>
            <p className="mt-2 font-bold t-text">대출 이자 계산기</p>
            <p className="mt-1 text-sm text-brand-600">
              원리금균등/원금균등 비교 계산
            </p>
          </TrackedLink>
          <TrackedLink
            href="/rate/calculator?tab=dsr"
            ctaName="rate_tool_click"
            params={{ tool: "dsr" }}
            className="card-hover rounded-2xl border-2 brand-tint-border p-6 text-center t-card"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl brand-tint-icon-bg text-sm font-bold text-brand-600">
              DSR
            </div>
            <p className="mt-2 font-bold t-text">DSR 계산기</p>
            <p className="mt-1 text-sm text-brand-600">
              총부채원리금상환비율 확인
            </p>
          </TrackedLink>
          <TrackedLink
            href="/rate/calculator?tab=jeonse"
            ctaName="rate_tool_click"
            params={{ tool: "jeonse" }}
            className="card-hover rounded-2xl border t-border t-card p-6 text-center"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl t-elevated text-sm font-bold t-text">
              전/월
            </div>
            <p className="mt-2 font-bold t-text">전세-월세 전환</p>
            <p className="mt-1 text-sm t-text-secondary">
              전세 보증금을 월세로 환산
            </p>
          </TrackedLink>
        </div>
      </section>

      {/* Quick Links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <TrackedLink
          href="/"
          ctaName="rate_related_link_click"
          params={{ href: "/" }}
          className="card-hover rounded-2xl border t-border t-card p-5 flex items-center gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dark-900 text-sm font-bold text-white">
            TOP
          </div>
          <div>
            <p className="font-bold t-text">폭락/신고가 랭킹</p>
            <p className="text-sm t-text-secondary">오늘 가장 많이 떨어진 아파트 확인</p>
          </div>
        </TrackedLink>
        <TrackedLink
          href="/daily/archive"
          ctaName="rate_related_link_click"
          params={{ href: "/daily/archive" }}
          className="card-hover rounded-2xl border t-border t-card p-5 flex items-center gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl t-elevated text-sm font-bold t-text">
            Daily
          </div>
          <div>
            <p className="font-bold t-text">데일리 리포트</p>
            <p className="text-sm t-text-secondary">매일 업데이트되는 시장 동향</p>
          </div>
        </TrackedLink>
      </div>

      <SignalLandingFooter
        eventScope="rate"
        methodTitle="금리 데이터 기준"
        methodItems={[
          "기준금리, COFIX, CD, 국고채 등 주요 지표를 최신 기준일 순으로 정리합니다.",
          "은행별 주담대 금리는 BANK_UNKNOWN을 제외하고 평균, 최저, 최고 값을 계산합니다.",
          "금리 변동폭은 bp 단위로 표시하며, 실제 적용 금리는 개인 조건과 우대금리에 따라 달라질 수 있습니다.",
          "계산기에서는 대출 원금, 기간, 금리를 바꿔 월 상환액을 직접 비교할 수 있습니다.",
        ]}
        relatedLinks={[
          {
            href: "/rate/calculator",
            title: "대출 이자 계산기",
            description: "오늘 금리를 내 대출 원금에 적용해 월 상환액을 계산합니다.",
          },
          {
            href: "/today",
            title: "오늘의 실거래가",
            description: "거래가를 먼저 보고 금리 부담을 이어서 확인합니다.",
          },
          {
            href: "/rent",
            title: "전월세 실거래가",
            description: "매매 대신 전세·월세 부담 흐름을 같이 봅니다.",
          },
          {
            href: "/daily/archive",
            title: "데일리 리포트",
            description: "날짜별 금리와 거래 신호를 요약해서 확인합니다.",
          },
        ]}
      />
      </div>
    </div>
  );
}
