import { db } from "@/lib/db";
import { homepageCache, aptTransactions, financeRates, pageViews } from "@/lib/db/schema";
import { eq, desc, asc, lt, isNotNull, isNull, gte, and, sql } from "drizzle-orm";
import AdSlot from "@/components/ads/AdSlot";
import CoupangBanner from "@/components/CoupangBanner";
import { RATE_ORDER } from "@/lib/format";
import RankingTabs from "@/components/home/RankingTabs";
import type { Transaction } from "@/components/home/RankingTabs";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import HeroSection from "@/components/home/HeroSection";
import StatsBar from "@/components/home/StatsBar";
import RateBar from "@/components/home/RateBar";
import SearchCTA from "@/components/home/SearchCTA";
import QuickLinks from "@/components/home/QuickLinks";
import PopularComplexes from "@/components/home/PopularComplexes";
import SidebarRateCard from "@/components/home/SidebarRateCard";
import type { Metadata } from "next";
import type { AptTransaction, FinanceRate } from "@/types/db";
import { adjustFloorPrice, isDirectDeal, LOW_FLOOR_MAX } from "@/lib/price-normalization";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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

function filterByType<T extends { property_type: number }>(rows: T[], validType: number): T[] {
  if (validType === 0) return rows;
  return rows.filter((r) => r.property_type === validType);
}

type DropLevel = "normal" | "decline" | "crash" | "severe";
function calcDropLevel(changeRate: number | null): DropLevel {
  if (changeRate === null) return "normal";
  if (changeRate <= -25) return "severe";
  if (changeRate <= -15) return "crash";
  if (changeRate <= -10) return "decline";
  return "normal";
}

function applyRankingNormalization(txns: AptTransaction[]): AptTransaction[] {
  return txns
    .filter((t) => {
      // RANK-02: exclude suspicious direct deals
      // Use highest_price as median proxy (no per-complex median in ranking context)
      if (
        isDirectDeal(t.deal_type) &&
        t.highest_price !== null &&
        t.highest_price > 0 &&
        t.trade_price < t.highest_price * 0.70
      ) {
        return false;
      }
      return true;
    })
    .map((t) => {
      // RANK-01: recompute change_rate for low-floor trades
      if (
        t.floor !== null &&
        t.floor > 0 &&
        t.floor <= LOW_FLOOR_MAX &&
        t.highest_price !== null &&
        t.highest_price > 0
      ) {
        const adjustedPrice = adjustFloorPrice(t.trade_price, t.floor);
        const newRate = parseFloat(
          (((adjustedPrice - t.highest_price) / t.highest_price) * 100).toFixed(2)
        );
        return { ...t, change_rate: newRate, drop_level: calcDropLevel(newRate) };
      }
      return t;
    });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;
  let drops: AptTransaction[] = [];
  let highs: AptTransaction[] = [];
  let volume: AptTransaction[] = [];
  let recent: AptTransaction[] = [];
  let rates: FinanceRate[] = [];
  let totalTxns = 0;
  let totalComplexes = 0;
  let popularItems: { page_path: string; page_type: string | null; view_count: number }[] = [];

  try {
    const cacheRows = await db
      .select({
        drops: homepageCache.drops,
        highs: homepageCache.highs,
        volume: homepageCache.volume,
        recent: homepageCache.recent,
        rates: homepageCache.rates,
        totalTransactions: homepageCache.totalTransactions,
        totalComplexes: homepageCache.totalComplexes,
      })
      .from(homepageCache)
      .where(eq(homepageCache.id, 1))
      .limit(1);

    const cache = cacheRows[0] ?? null;

    if (cache && cache.drops) {
      const rawDrops = ((typeof cache.drops === "string" ? JSON.parse(cache.drops) : cache.drops) ?? []) as AptTransaction[];
      const rawHighs = ((typeof cache.highs === "string" ? JSON.parse(cache.highs) : cache.highs) ?? []) as AptTransaction[];
      const allVolume = typeof cache.volume === "string" ? JSON.parse(cache.volume) : cache.volume;
      const allRecent = typeof cache.recent === "string" ? JSON.parse(cache.recent) : cache.recent;

      const normalizedDrops = applyRankingNormalization(rawDrops);
      normalizedDrops.sort((a, b) => (a.change_rate ?? 0) - (b.change_rate ?? 0));
      const normalizedHighs = applyRankingNormalization(rawHighs);

      drops = filterByType(normalizedDrops, validType).slice(0, 10);
      highs = filterByType(normalizedHighs, validType).slice(0, 10);
      volume = filterByType((allVolume ?? []) as AptTransaction[], validType).slice(0, 10);
      recent = filterByType((allRecent ?? []) as AptTransaction[], validType).slice(0, 10);
      rates = typeof cache.rates === "string" ? JSON.parse(cache.rates) : (cache.rates ?? []);
      totalTxns = Number(cache.totalTransactions) || 0;
      totalComplexes = Number(cache.totalComplexes) || 0;
    } else {
      const txFields = {
        id: aptTransactions.id,
        region_code: aptTransactions.regionCode,
        region_name: aptTransactions.regionName,
        apt_name: aptTransactions.aptName,
        size_sqm: aptTransactions.sizeSqm,
        floor: aptTransactions.floor,
        trade_price: aptTransactions.tradePrice,
        trade_date: aptTransactions.tradeDate,
        highest_price: aptTransactions.highestPrice,
        change_rate: aptTransactions.changeRate,
        is_new_high: aptTransactions.isNewHigh,
        is_significant_drop: aptTransactions.isSignificantDrop,
        deal_type: aptTransactions.dealType,
        drop_level: aptTransactions.dropLevel,
        property_type: aptTransactions.propertyType,
      };

      const typeFilter = validType !== 0 ? eq(aptTransactions.propertyType, validType) : undefined;

      const [dropsRes, highsRes, volumeRes, recentRes, ratesRes, txnCount, complexCount] = await Promise.allSettled([
        db.select(txFields).from(aptTransactions)
          .where(and(isNotNull(aptTransactions.changeRate), lt(aptTransactions.changeRate, "0"), typeFilter))
          .orderBy(asc(aptTransactions.changeRate))
          .limit(10),
        db.select(txFields).from(aptTransactions)
          .where(and(eq(aptTransactions.isNewHigh, true), typeFilter))
          .orderBy(desc(aptTransactions.tradeDate))
          .limit(10),
        db.select(txFields).from(aptTransactions)
          .where(typeFilter)
          .orderBy(desc(aptTransactions.tradeDate), desc(aptTransactions.tradePrice))
          .limit(10),
        db.select(txFields).from(aptTransactions)
          .where(typeFilter)
          .orderBy(desc(aptTransactions.tradeDate))
          .limit(10),
        db.select({
          rate_type: financeRates.rateType,
          rate_value: financeRates.rateValue,
          prev_value: financeRates.prevValue,
          change_bp: financeRates.changeBp,
          base_date: financeRates.baseDate,
          source: financeRates.source,
        }).from(financeRates)
          .orderBy(desc(financeRates.baseDate))
          .limit(5),
        db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
        db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
      ]);

      const rawDropsFallback: AptTransaction[] = dropsRes.status === "fulfilled" ? dropsRes.value as unknown as AptTransaction[] : [];
      const rawHighsFallback: AptTransaction[] = highsRes.status === "fulfilled" ? highsRes.value as unknown as AptTransaction[] : [];

      const normDrops = applyRankingNormalization(rawDropsFallback);
      normDrops.sort((a, b) => (a.change_rate ?? 0) - (b.change_rate ?? 0));
      drops = normDrops.slice(0, 10);

      const normHighs = applyRankingNormalization(rawHighsFallback);
      highs = normHighs.slice(0, 10);
      volume = volumeRes.status === "fulfilled" ? volumeRes.value as unknown as AptTransaction[] : [];
      recent = recentRes.status === "fulfilled" ? recentRes.value as unknown as AptTransaction[] : [];
      rates = ratesRes.status === "fulfilled" ? ratesRes.value as unknown as FinanceRate[] : [];
      totalTxns = txnCount.status === "fulfilled" ? Number(txnCount.value[0]?.count ?? 0) : 0;
      totalComplexes = complexCount.status === "fulfilled" ? Number(complexCount.value[0]?.count ?? 0) : 0;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split("T")[0];

    const popularData = await db.select({
      page_path: pageViews.pagePath,
      page_type: pageViews.pageType,
      view_count: pageViews.viewCount,
    }).from(pageViews)
      .where(and(gte(pageViews.viewDate, startDateStr), eq(pageViews.pageType, "apt_detail")))
      .orderBy(desc(pageViews.viewCount))
      .limit(10);
    popularItems = popularData;
  } catch (e) {
    console.error("[Homepage] DB query failed:", e instanceof Error ? e.message : e);
  }

  const heroTx = drops.length > 0 ? drops[0] : null;
  const heroHigh = !heroTx && highs.length > 0 ? highs[0] : null;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const sortedRates = [...rates].sort(
    (a, b) => RATE_ORDER.indexOf(a.rate_type) - RATE_ORDER.indexOf(b.rate_type),
  );

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqJsonLd
        items={[
          {
            question: "돈줍은 어떤 서비스인가요?",
            answer: "돈줍은 국토교통부 실거래가 공개시스템과 한국은행 ECOS 데이터를 기반으로, 전국 아파트 폭락/신고가 랭킹과 대출 금리 변동 정보를 매일 자동 업데이트하여 제공하는 부동산 데이터 대시보드입니다.",
          },
          {
            question: "데이터는 얼마나 자주 업데이트되나요?",
            answer: "실거래가 데이터는 국토교통부 공개 후 매일 자동으로 수집되며, 금리 데이터는 한국은행 기준으로 업데이트됩니다.",
          },
          {
            question: "돈줍의 데이터는 무료인가요?",
            answer: "네, 돈줍의 모든 실거래가 조회와 금리 정보 서비스는 무료로 제공됩니다.",
          },
        ]}
      />

      <HeroSection heroTx={heroTx} heroHigh={heroHigh} today={today} />
      <PropertyTypeFilter currentType={validType} />
      <StatsBar
        totalTxns={totalTxns}
        totalComplexes={totalComplexes}
        dropCount={drops.length}
        highCount={highs.length}
      />
      <RateBar rates={sortedRates} />
      <SearchCTA />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdSlot slotId="home-top-banner" format="banner" />

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RankingTabs
              drops={(drops as Transaction[]) ?? []}
              highs={(highs as Transaction[]) ?? []}
              volume={(volume as Transaction[]) ?? []}
              recent={(recent as Transaction[]) ?? []}
              showTypeBadge={validType === 0}
            />
          </div>

          <aside className="space-y-5">
            <QuickLinks />
            <PopularComplexes items={popularItems} />
            <SidebarRateCard rates={sortedRates} />
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
