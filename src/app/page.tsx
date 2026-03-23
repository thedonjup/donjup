import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AdSlot from "@/components/ads/AdSlot";
import CoupangBanner from "@/components/CoupangBanner";
import { formatPrice, RATE_LABELS, RATE_ORDER } from "@/lib/format";
import RankingTabs from "@/components/home/RankingTabs";
import type { Transaction } from "@/components/home/RankingTabs";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";

export const revalidate = 300;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "돈줍 DonJup",
  url: "https://donjup.com",
  description:
    "매일 자동 업데이트되는 전국 아파트 실거래가 폭락/신고가 랭킹과 대출 금리 정보",
  publisher: {
    "@type": "Organization",
    name: "돈줍",
    url: "https://donjup.com",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: "https://donjup.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;
  let drops: any[] = [];
  let highs: any[] = [];
  let volume: any[] = [];
  let recent: any[] = [];
  let rates: any[] = [];
  let totalTxns: number | null = 0;
  let totalComplexes: number | null = 0;

  try {
    const supabase = await createClient();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000); // 30초 타임아웃 (CockroachDB 해외 리전)

    const txFields = "id,region_code,region_name,apt_name,size_sqm,floor,trade_price,trade_date,highest_price,change_rate,is_new_high,is_significant_drop,deal_type,drop_level,property_type";

    const applyTypeFilter = (q: any) => validType !== 0 ? q.eq("property_type", validType) : q;

    const [dropsRes, highsRes, volumeRes, recentRes, ratesRes, txnCount, complexCount] = await Promise.allSettled([
      applyTypeFilter(supabase.from("apt_transactions").select(txFields).not("change_rate", "is", null).lt("change_rate", 0)).order("change_rate", { ascending: true }).limit(10).abortSignal(ac.signal),
      applyTypeFilter(supabase.from("apt_transactions").select(txFields).eq("is_new_high", true)).order("trade_date", { ascending: false }).limit(10).abortSignal(ac.signal),
      applyTypeFilter(supabase.from("apt_transactions").select(txFields)).order("trade_date", { ascending: false }).order("trade_price", { ascending: false }).limit(10).abortSignal(ac.signal),
      applyTypeFilter(supabase.from("apt_transactions").select(txFields)).order("trade_date", { ascending: false }).limit(10).abortSignal(ac.signal),
      supabase.from("finance_rates").select("rate_type,rate_value,prev_value,change_bp,base_date,source").order("base_date", { ascending: false }).limit(5).abortSignal(ac.signal),
      supabase.from("apt_transactions").select("id", { count: "exact", head: true }).abortSignal(ac.signal),
      supabase.from("apt_complexes").select("id", { count: "exact", head: true }).abortSignal(ac.signal),
    ]);

    clearTimeout(timer);

    drops = dropsRes.status === "fulfilled" ? dropsRes.value.data ?? [] : [];
    highs = highsRes.status === "fulfilled" ? highsRes.value.data ?? [] : [];
    volume = volumeRes.status === "fulfilled" ? volumeRes.value.data ?? [] : [];
    recent = recentRes.status === "fulfilled" ? recentRes.value.data ?? [] : [];
    rates = ratesRes.status === "fulfilled" ? ratesRes.value.data ?? [] : [];
    totalTxns = txnCount.status === "fulfilled" ? txnCount.value.count : 0;
    totalComplexes = complexCount.status === "fulfilled" ? complexCount.value.count : 0;
  } catch (e) {
    console.error("[Homepage] DB query failed:", e instanceof Error ? e.message : e);
  }

  const dropCount = drops?.length ?? 0;
  const highCount = highs?.length ?? 0;

  // Hero: pick the most dramatic transaction
  const heroTx = drops && drops.length > 0 ? drops[0] : null;
  const heroHigh = !heroTx && highs && highs.length > 0 ? highs[0] : null;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // Sort rates by RATE_ORDER
  const sortedRates = rates
    ? [...rates].sort(
        (a, b) =>
          RATE_ORDER.indexOf(a.rate_type) - RATE_ORDER.indexOf(b.rate_type),
      )
    : [];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============================================ */}
      {/* 1. Hero Section - 감정 자극형                  */}
      {/* ============================================ */}
      <section className="hero-gradient text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          {/* Live badge + date */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-brand-400" />
            <span>실시간 업데이트</span>
            <span className="mx-1">·</span>
            <span>{today}</span>
          </div>

          {/* Big dramatic headline */}
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {heroTx ? (
              <>
                <span className="text-red-400">{heroTx.apt_name}</span>
                <br />
                <span>최고가 대비 </span>
                <span
                  className="inline-block rounded-lg px-3 py-1"
                  style={{
                    backgroundColor:
                      heroTx.drop_level === "severe"
                        ? "rgba(220,38,38,0.2)"
                        : heroTx.drop_level === "crash"
                          ? "rgba(239,68,68,0.2)"
                          : "rgba(245,158,11,0.2)",
                    color:
                      heroTx.drop_level === "severe"
                        ? "#dc2626"
                        : heroTx.drop_level === "crash"
                          ? "#ef4444"
                          : "#f59e0b",
                  }}
                >
                  -{Math.abs(heroTx.change_rate!)}%
                </span>
                <span>
                  {" "}
                  {heroTx.drop_level === "severe"
                    ? "대폭락"
                    : heroTx.drop_level === "crash"
                      ? "폭락"
                      : "하락"}
                </span>
              </>
            ) : heroHigh ? (
              <>
                <span className="text-brand-400">{heroHigh.apt_name}</span>
                <br />
                <span>신고가 </span>
                <span className="inline-block rounded-lg bg-brand-500/20 px-3 py-1 text-brand-400">
                  {formatPrice(heroHigh.trade_price)}
                </span>
                <span> 경신</span>
              </>
            ) : (
              <>
                전국 아파트 실거래가
                <br />
                폭락·신고가 랭킹
              </>
            )}
          </h1>

          {/* Sub-headline with price details */}
          <p className="mt-4 max-w-2xl text-lg text-gray-400 sm:text-xl">
            {heroTx
              ? `${formatPrice(heroTx.highest_price!)} → ${formatPrice(heroTx.trade_price)} | ${heroTx.region_name} · 국토교통부 실거래가 기반`
              : heroHigh
                ? `${heroHigh.region_name} · 국토교통부 실거래가 기반`
                : "매일 자동 업데이트되는 전국 아파트 폭락/신고가 랭킹과 금리 변동 정보"}
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* 2.5 Property Type Filter                     */}
      {/* ============================================ */}
      <PropertyTypeFilter currentType={validType} />

      {/* ============================================ */}
      {/* 3. Stats Bar                                 */}
      {/* ============================================ */}
      <section className="border-b t-border t-card">
        <div className="mx-auto flex max-w-6xl items-stretch gap-0 overflow-x-auto">
          <StatBarItem
            label="오늘 거래건수"
            value={totalTxns ?? 0}
            suffix="건"
            accent="t-drop"
          />
          <StatBarItem
            label="전국 단지수"
            value={totalComplexes ?? 0}
            suffix="개"
            accent="text-brand-600"
          />
          <StatBarItem
            label="폭락 건수"
            value={dropCount}
            suffix="건"
            accent="t-drop"
          />
          <StatBarItem
            label="신고가 건수"
            value={highCount}
            suffix="건"
            accent="t-rise"
          />
        </div>
      </section>

      {/* ============================================ */}
      {/* 4. Interest Rate Bar                         */}
      {/* ============================================ */}
      {sortedRates.length > 0 && (
        <section className="border-b t-border t-card">
          <div className="mx-auto flex max-w-6xl items-center gap-0 overflow-x-auto">
            {sortedRates.map((r) => (
              <div
                key={r.id}
                className="flex min-w-0 flex-1 items-center justify-between border-r last:border-r-0 t-border px-4 py-3"
              >
                <span className="truncate text-xs font-medium t-text-secondary">
                  {RATE_LABELS[r.rate_type] || r.rate_type}
                </span>
                <div className="ml-2 flex items-center gap-1.5">
                  <span className="text-sm font-bold tabular-nums t-text">
                    {r.rate_value}%
                  </span>
                  {r.change_bp !== null && r.change_bp !== 0 && (
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        r.change_bp > 0 ? "t-drop" : "t-rise"
                      }`}
                    >
                      {r.change_bp > 0 ? "▲" : "▼"}
                      {Math.abs(r.change_bp)}bp
                    </span>
                  )}
                </div>
              </div>
            ))}
            <Link
              href="/rate"
              className="flex-shrink-0 px-4 py-3 text-xs font-semibold text-brand-600 hover:underline"
            >
              자세히 &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* Main Content Area                            */}
      {/* ============================================ */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdSlot slotId="home-top-banner" format="banner" />

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Left: Tab-based Rankings */}
          <div className="lg:col-span-2">
            <RankingTabs
              drops={(drops as Transaction[]) ?? []}
              highs={(highs as Transaction[]) ?? []}
              volume={(volume as Transaction[]) ?? []}
              recent={(recent as Transaction[]) ?? []}
              showTypeBadge={validType === 0}
            />
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-5">
            {/* ============================== */}
            {/* 5. Quick Links / CTA           */}
            {/* ============================== */}
            <div className="grid grid-cols-2 gap-3">
              <QuickLinkCard
                href="/search"
                icon="search"
                label="검색 바로가기"
                desc="아파트명·지역 검색"
              />
              <QuickLinkCard
                href="/rent"
                icon="rent"
                label="전월세 시세"
                desc="전세가율·월세 TOP"
              />
              <QuickLinkCard
                href="/rate/calculator"
                icon="calc"
                label="대출 계산기"
                desc="월 이자 시뮬레이션"
              />
              <QuickLinkCard
                href={`/daily/${new Date().toISOString().split("T")[0]}`}
                icon="report"
                label="데일리 리포트"
                desc="오늘의 시장 종합"
              />
            </div>

            {/* Compact Rate Card */}
            {sortedRates.length > 0 && (
              <div className="rounded-2xl border t-border t-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold t-text">금리 현황</h2>
                  <Link
                    href="/rate"
                    className="text-xs text-brand-600 hover:underline"
                  >
                    자세히 &rarr;
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {sortedRates.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-1"
                    >
                      <div>
                        <p className="text-sm font-medium t-text">
                          {RATE_LABELS[r.rate_type] || r.rate_type}
                        </p>
                        <p className="text-[11px] t-text-tertiary">
                          {r.base_date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold tabular-nums t-text">
                          {r.rate_value}%
                        </p>
                        {r.change_bp !== null && r.change_bp !== 0 && (
                          <p
                            className={`text-[11px] font-semibold tabular-nums ${
                              r.change_bp > 0 ? "t-drop" : "t-rise"
                            }`}
                          >
                            {r.change_bp > 0 ? "▲" : "▼"}{" "}
                            {Math.abs(r.change_bp)}bp
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <CoupangBanner
              category="book"
              title="부동산 투자 추천도서"
              className="hidden lg:block"
            />

            <AdSlot
              slotId="home-sidebar-rect"
              format="rectangle"
              className="hidden lg:block"
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatBarItem({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix: string;
  accent: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center border-r last:border-r-0 t-border px-4 py-4 sm:px-6">
      <p className="text-[11px] font-medium t-text-tertiary">{label}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums ${accent}`}>
        {value.toLocaleString()}
        <span className="ml-0.5 text-xs font-medium t-text-tertiary">
          {suffix}
        </span>
      </p>
    </div>
  );
}

function QuickLinkCard({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: "search" | "rent" | "calc" | "report";
  label: string;
  desc: string;
}) {
  const iconMap = {
    search: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    rent: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    calc: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    report: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  };

  return (
    <Link
      href={href}
      className="card-hover flex flex-col items-center rounded-xl border t-border t-card p-4 text-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {iconMap[icon]}
      </div>
      <p className="mt-2 text-sm font-bold t-text">{label}</p>
      <p className="mt-0.5 text-[11px] t-text-tertiary">{desc}</p>
    </Link>
  );
}
