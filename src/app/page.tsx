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
import QuickLinks from "@/components/home/QuickLinks";
import PopularComplexes from "@/components/home/PopularComplexes";
import SidebarRateCard from "@/components/home/SidebarRateCard";
import type { Metadata } from "next";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  getCachedHomePageData,
  type HomeFinanceRate,
  type HomePopularItem,
  type HomeTransaction,
} from "@/lib/home-page-query";

export const revalidate = 1800;

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;

  let drops: HomeTransaction[] = [];
  let highs: HomeTransaction[] = [];
  let volume: HomeTransaction[] = [];
  let recent: HomeTransaction[] = [];
  let rates: HomeFinanceRate[] = [];
  let totalTxns = 0;
  let totalComplexes = 0;
  let popularItems: HomePopularItem[] = [];

  try {
    const homeData = await getCachedHomePageData(validType);
    drops = homeData.drops;
    highs = homeData.highs;
    volume = homeData.volume;
    recent = homeData.recent;
    rates = homeData.rates;
    totalTxns = homeData.totalTxns;
    totalComplexes = homeData.totalComplexes;
    popularItems = homeData.popularItems;
  } catch (e) {
    logDatabaseFailure("Homepage query failed", e, {
      route: "/",
    });
  }

  const heroTx = drops.length > 0 ? drops[0] : null;
  const heroHigh = !heroTx && highs.length > 0 ? highs[0] : null;
  const latestTx = recent.length > 0 ? recent[0] : null;

  const todayStr = new Date().toLocaleDateString("ko-KR", {
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

      <HeroSection
        heroTx={heroTx}
        heroHigh={heroHigh}
        latestTx={latestTx}
        rates={sortedRates}
        today={todayStr}
        totalTxns={totalTxns}
        totalComplexes={totalComplexes}
      />
      <PropertyTypeFilter currentType={validType} />
      <StatsBar
        totalTxns={totalTxns}
        totalComplexes={totalComplexes}
        dropCount={drops.length}
        highCount={highs.length}
      />
      <RateBar rates={sortedRates} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdSlot slotId="home-top-banner" format="banner" />

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RankingTabs
              drops={(drops as unknown as Transaction[]) ?? []}
              highs={(highs as unknown as Transaction[]) ?? []}
              volume={(volume as unknown as Transaction[]) ?? []}
              recent={(recent as unknown as Transaction[]) ?? []}
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
