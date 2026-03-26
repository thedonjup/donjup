import { createClient } from "@/lib/db/server";
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function filterByType(rows: any[], validType: number): any[] {
  if (validType === 0) return rows;
  return rows.filter((r: any) => r.property_type === validType);
}

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
  let totalTxns = 0;
  let totalComplexes = 0;
  let popularItems: { page_path: string; page_type: string | null; view_count: number }[] = [];

  try {
    const supabase = await createClient();

    const { data: cache } = await supabase
      .from("homepage_cache")
      .select("drops,highs,volume,recent,rates,total_transactions,total_complexes,updated_at")
      .eq("id", 1)
      .single();

    if (cache && cache.drops) {
      const allDrops = typeof cache.drops === "string" ? JSON.parse(cache.drops) : cache.drops;
      const allHighs = typeof cache.highs === "string" ? JSON.parse(cache.highs) : cache.highs;
      const allVolume = typeof cache.volume === "string" ? JSON.parse(cache.volume) : cache.volume;
      const allRecent = typeof cache.recent === "string" ? JSON.parse(cache.recent) : cache.recent;

      drops = filterByType(allDrops ?? [], validType).slice(0, 10);
      highs = filterByType(allHighs ?? [], validType).slice(0, 10);
      volume = filterByType(allVolume ?? [], validType).slice(0, 10);
      recent = filterByType(allRecent ?? [], validType).slice(0, 10);
      rates = typeof cache.rates === "string" ? JSON.parse(cache.rates) : (cache.rates ?? []);
      totalTxns = Number(cache.total_transactions) || 0;
      totalComplexes = Number(cache.total_complexes) || 0;
    } else {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 30000);

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
      totalTxns = txnCount.status === "fulfilled" ? (txnCount.value.count ?? 0) : 0;
      totalComplexes = complexCount.status === "fulfilled" ? (complexCount.value.count ?? 0) : 0;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split("T")[0];

    const { data: popularData } = await supabase
      .from("page_views")
      .select("page_path,page_type,view_count")
      .gte("view_date", startDateStr)
      .eq("page_type", "apt_detail")
      .order("view_count", { ascending: false })
      .limit(10);
    popularItems = popularData ?? [];
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
