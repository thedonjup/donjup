import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { desc, ne } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import AdSlot from "@/components/ads/AdSlot";
import { RATE_LABELS, RATE_DESCRIPTIONS, RATE_ORDER } from "@/lib/format";
import { FaqJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import type { FinanceRate } from "@/types/db";
import RateIndicatorAccordion from "@/components/rate/RateIndicatorAccordion";
import type { IndicatorItem } from "@/components/rate/RateIndicatorAccordion";
import BankRateExpandable from "@/components/rate/BankRateExpandable";
import type { BankRateItem } from "@/components/rate/BankRateExpandable";

export const metadata: Metadata = {
  title: "금리 현황",
  description: "한국은행 기준금리, COFIX, CD금리, 국고채 금리 실시간 추이. 매일 자동 업데이트.",
  alternates: { canonical: "/rate" },
};

export const revalidate = 1800;

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
  let allRates: FinanceRate[] | null = null;
  let bankRatesRaw: FinanceRate[] | null = null;

  try {
    const [ratesRes, bankRes] = await Promise.all([
      db.select({
        id: financeRates.id,
        rate_type: financeRates.rateType,
        rate_value: financeRates.rateValue,
        prev_value: financeRates.prevValue,
        change_bp: financeRates.changeBp,
        base_date: financeRates.baseDate,
        source: financeRates.source,
        created_at: financeRates.createdAt,
      }).from(financeRates)
        .orderBy(desc(financeRates.baseDate))
        .limit(100),
      db.select({
        id: financeRates.id,
        rate_type: financeRates.rateType,
        rate_value: financeRates.rateValue,
        prev_value: financeRates.prevValue,
        change_bp: financeRates.changeBp,
        base_date: financeRates.baseDate,
        source: financeRates.source,
        created_at: financeRates.createdAt,
      }).from(financeRates)
        .where(ne(financeRates.rateType, "BANK_PRODUCTS_ALL"))
        .orderBy(desc(financeRates.baseDate))
        .limit(100),
    ]);

    allRates = ratesRes.map((r) => ({
      ...r,
      rate_value: Number(r.rate_value),
      prev_value: r.prev_value !== null ? Number(r.prev_value) : null,
      base_date: String(r.base_date),
      created_at: r.created_at ? String(r.created_at) : "",
    })) as FinanceRate[];

    bankRatesRaw = bankRes
      .filter((r) => r.rate_type.startsWith("BANK_"))
      .map((r) => ({
        ...r,
        rate_value: Number(r.rate_value),
        prev_value: r.prev_value !== null ? Number(r.prev_value) : null,
        base_date: String(r.base_date),
        created_at: r.created_at ? String(r.created_at) : "",
      })) as FinanceRate[];
  } catch {
    // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
  }

  // 은행별 최신 금리만 추출
  const bankRates = new Map<string, {
    rate_type: string;
    rate_value: number;
    prev_value: number | null;
    change_bp: number | null;
    base_date: string;
  }>();
  for (const r of bankRatesRaw ?? []) {
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

  for (const r of allRates ?? []) {
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
  const avgRate = validBanks.length > 0
    ? parseFloat((validBanks.reduce((s, r) => s + r.rate_value, 0) / validBanks.length).toFixed(2))
    : null;
  const minRate = validBanks[0]?.rate_value ?? null;
  const maxRate = validBanks[validBanks.length - 1]?.rate_value ?? null;
  const heroBaseDate = validBanks[0]?.base_date ?? "";
  const bpItems = validBanks.filter(r => r.change_bp !== null).map(r => r.change_bp!);
  const avgChangeBp = bpItems.length > 0
    ? Math.round(bpItems.reduce((s, v) => s + v, 0) / bpItems.length)
    : null;

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
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
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text">금리 현황</h1>
        </div>
        <p className="text-sm t-text-secondary">
          주택담보대출과 관련된 주요 금리 지표를 한눈에 확인하세요.
        </p>
      </div>

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
          <p className="mt-3 text-sm t-text-secondary">
            아직 수집된 금리 데이터가 없습니다.
          </p>
          <p className="mt-1 text-xs t-text-tertiary">
            ECOS API 키가 설정되면 매일 자동으로 금리 데이터가 수집됩니다.
          </p>
        </div>
      )}

      {/* Calculator Tools */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold t-text">대출/부동산 도구</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/rate/calculator"
            className="card-hover rounded-2xl border-2 brand-tint-border p-6 text-center t-card"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl brand-tint-icon-bg text-sm font-bold text-brand-600">
              %%
            </div>
            <p className="mt-2 font-bold t-text">대출 이자 계산기</p>
            <p className="mt-1 text-sm text-brand-600">
              원리금균등/원금균등 비교 계산
            </p>
          </Link>
          <Link
            href="/rate/calculator?tab=dsr"
            className="card-hover rounded-2xl border-2 brand-tint-border p-6 text-center t-card"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl brand-tint-icon-bg text-sm font-bold text-brand-600">
              DSR
            </div>
            <p className="mt-2 font-bold t-text">DSR 계산기</p>
            <p className="mt-1 text-sm text-brand-600">
              총부채원리금상환비율 확인
            </p>
          </Link>
          <Link
            href="/rate/calculator?tab=jeonse"
            className="card-hover rounded-2xl border t-border t-card p-6 text-center"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl t-elevated text-sm font-bold t-text">
              전/월
            </div>
            <p className="mt-2 font-bold t-text">전세-월세 전환</p>
            <p className="mt-1 text-sm t-text-secondary">
              전세 보증금을 월세로 환산
            </p>
          </Link>
        </div>
      </section>

      {/* Quick Links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/"
          className="card-hover rounded-2xl border t-border t-card p-5 flex items-center gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dark-900 text-sm font-bold text-white">
            TOP
          </div>
          <div>
            <p className="font-bold t-text">폭락/신고가 랭킹</p>
            <p className="text-sm t-text-secondary">오늘 가장 많이 떨어진 아파트 확인</p>
          </div>
        </Link>
        <Link
          href="/daily/archive"
          className="card-hover rounded-2xl border t-border t-card p-5 flex items-center gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl t-elevated text-sm font-bold t-text">
            Daily
          </div>
          <div>
            <p className="font-bold t-text">데일리 리포트</p>
            <p className="text-sm t-text-secondary">매일 업데이트되는 시장 동향</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
