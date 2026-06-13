import TrackedLink from "@/components/analytics/TrackedLink";
import HomeSearchForm from "@/components/home/HomeSearchForm";
import { aptUrl } from "@/lib/apt-url";
import { formatPrice, formatRegion, RATE_LABELS } from "@/lib/format";
import {
  formatHomeRate,
  formatHomeRateChange,
  homeSignalHeadline,
} from "@/lib/home-signals";

interface Transaction {
  apt_name: string;
  region_code: string;
  region_name?: string;
  drop_level?: string | null;
  change_rate?: number | null;
  highest_price?: number | null;
  trade_price: number;
  trade_date?: string;
  size_sqm?: number | null;
  floor?: number | null;
  complex_slug?: string | null;
  govt_complex_id?: string | null;
}

interface Rate {
  rate_type: string;
  rate_value: number | string;
  change_bp: number | null;
}

interface HeroSectionProps {
  heroTx: Transaction | null;
  heroHigh: Transaction | null;
  latestTx: Transaction | null;
  rates: Rate[];
  today: string;
  totalTxns: number;
  totalComplexes: number;
}

function transactionHref(tx: Transaction | null, fallback: string): string {
  if (!tx) return fallback;
  return aptUrl({
    govtComplexId: tx.govt_complex_id ?? null,
    regionCode: tx.region_code,
    slug: tx.complex_slug ?? "",
  });
}

function SignalCard({
  label,
  title,
  value,
  meta,
  href,
  tone,
  eventType,
}: {
  label: string;
  title: string;
  value: string;
  meta: string;
  href: string;
  tone: "drop" | "rise" | "neutral" | "rate";
  eventType: string;
}) {
  const toneClass = {
    drop: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200",
    rise: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
    neutral: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
    rate: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
  }[tone];

  return (
    <TrackedLink
      href={href}
      ctaName="home_signal_card_click"
      params={{ signal_type: eventType, label }}
      className={`block rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClass}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 truncate text-sm font-extrabold">{title}</p>
      <p className="mt-1 text-xl font-black tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs opacity-75">{meta}</p>
    </TrackedLink>
  );
}

export default function HeroSection({
  heroTx,
  heroHigh,
  latestTx,
  rates,
  today,
  totalTxns,
  totalComplexes,
}: HeroSectionProps) {
  const primaryRate = rates[0] ?? null;
  const headlineTx = heroTx ?? heroHigh ?? latestTx;
  const headline = homeSignalHeadline({ heroTx, heroHigh, latestTx });

  return (
    <section className="border-b t-border bg-[var(--color-surface-card)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
        <div>
          <div className="inline-flex items-center rounded-full border t-border bg-[var(--color-surface-page)] px-3 py-1 text-xs font-semibold t-text-secondary">
            <span className="mr-2 h-2 w-2 rounded-full bg-brand-500" />
            {today} 데이터 기준
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight t-text sm:text-5xl">
            오늘의 부동산 신호
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 t-text-secondary sm:text-lg">
            하락 거래, 신고가, 최신 거래, 금리 변화를 한 화면에서 확인하세요.
            돈줍은 매일 갱신되는 실거래가와 금융 데이터를 신호로 정리합니다.
          </p>

          <div className="mt-5 rounded-lg border t-border bg-[var(--color-surface-page)] p-4">
            <p className="text-xs font-bold text-brand-700 dark:text-brand-300">오늘 포착</p>
            <p className="mt-1 text-lg font-extrabold t-text">{headline}</p>
            <p className="mt-1 text-sm t-text-tertiary">
              {headlineTx
                ? `${formatRegion(headlineTx.region_code)} · ${formatPrice(headlineTx.trade_price)}`
                : `${totalTxns.toLocaleString()}건 거래 · ${totalComplexes.toLocaleString()}개 단지 추적`}
            </p>
          </div>

          <HomeSearchForm />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SignalCard
            label="최대 하락"
            title={heroTx?.apt_name ?? "하락 신호 준비 중"}
            value={
              heroTx?.change_rate !== null && heroTx?.change_rate !== undefined
                ? `${Math.abs(heroTx.change_rate)}%`
                : "-"
            }
            meta={
              heroTx
                ? `${formatRegion(heroTx.region_code)} · ${formatPrice(heroTx.trade_price)}`
                : "오늘 하락 거래를 집계 중입니다"
            }
            href={transactionHref(heroTx, "/today")}
            tone="drop"
            eventType="drop"
          />
          <SignalCard
            label="신고가"
            title={heroHigh?.apt_name ?? "신고가 신호 준비 중"}
            value={heroHigh ? formatPrice(heroHigh.trade_price) : "-"}
            meta={
              heroHigh
                ? `${formatRegion(heroHigh.region_code)} · 국토부 실거래`
                : "신고가 거래를 집계 중입니다"
            }
            href={transactionHref(heroHigh, "/new-highs")}
            tone="rise"
            eventType="high"
          />
          <SignalCard
            label="최신 거래"
            title={latestTx?.apt_name ?? "최신 거래 준비 중"}
            value={latestTx ? formatPrice(latestTx.trade_price) : "-"}
            meta={
              latestTx
                ? `${formatRegion(latestTx.region_code)} · ${latestTx.trade_date ?? "거래일 확인"}`
                : "최근 거래를 집계 중입니다"
            }
            href={transactionHref(latestTx, "/search")}
            tone="neutral"
            eventType="recent"
          />
          <SignalCard
            label={primaryRate ? RATE_LABELS[primaryRate.rate_type] ?? "금리" : "금리"}
            title="대출 부담 신호"
            value={formatHomeRate(primaryRate)}
            meta={formatHomeRateChange(primaryRate)}
            href="/rate"
            tone="rate"
            eventType="rate"
          />
        </div>
      </div>
    </section>
  );
}
