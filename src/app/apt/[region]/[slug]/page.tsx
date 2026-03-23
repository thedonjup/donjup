import { createClient } from "@/lib/supabase/server";
import { createRentServiceClient } from "@/lib/supabase/rent-client";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import CoupangBanner from "@/components/CoupangBanner";
import ShareButtons from "@/components/ShareButtons";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";
import PriceHistoryChart from "@/components/charts/PriceHistoryChartWrapper";
import TransactionTabs from "@/components/apt/TransactionTabs";
import NotifyButton from "@/components/apt/NotifyButton";
import FavoriteButton from "@/components/apt/FavoriteButton";
import MiniLoanCalculator from "@/components/apt/MiniLoanCalculator";
import AptNews from "@/components/apt/AptNews";
import Comments from "@/components/apt/Comments";

export const revalidate = 3600;

interface Transaction {
  id: string;
  size_sqm: number;
  floor: number;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  deal_type: string | null;
}

interface RentTransaction {
  id: string;
  size_sqm: number;
  floor: number | null;
  deposit: number;
  monthly_rent: number;
  rent_type: string;
  contract_type: string | null;
  trade_date: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: complex } = await supabase
    .from("apt_complexes")
    .select("apt_name,region_name,dong_name")
    .eq("slug", slug)
    .single();

  if (!complex) {
    return { title: "단지 정보" };
  }

  const title = `${complex.apt_name} 실거래가 - ${complex.region_name} ${complex.dong_name ?? ""}`;
  return {
    title,
    description: `${complex.apt_name} 아파트 실거래가 시세, 최고가 대비 변동률, 거래 이력을 확인하세요. ${complex.region_name} ${complex.dong_name ?? ""} 매매·전월세 시세 비교.`,
    keywords: [
      `${complex.apt_name} 실거래가`,
      `${complex.apt_name} 시세`,
      `${complex.apt_name} 아파트`,
      `${complex.region_name} 아파트`,
      "아파트 실거래가",
      "아파트 시세 조회",
    ],
  };
}

export default async function AptDetailPage({
  params,
}: {
  params: Promise<{ region: string; slug: string }>;
}) {
  const { slug, region } = await params;
  const supabase = await createClient();

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);

  const { data: complex } = await supabase
    .from("apt_complexes")
    .select("*")
    .eq("slug", slug)
    .abortSignal(ac.signal)
    .single();

  if (!complex) {
    clearTimeout(timer);
    notFound();
  }

  let txns: Transaction[] = [];
  let rentTxns: RentTransaction[] = [];
  let nearbyComplexes: { slug: string; apt_name: string; region_code: string; region_name: string; dong_name: string | null; built_year: number | null; total_units: number | null }[] = [];

  try {
    const { data: transactions } = await supabase
      .from("apt_transactions")
      .select("id,size_sqm,floor,trade_price,trade_date,highest_price,change_rate,is_new_high,is_significant_drop,deal_type,drop_level")
      .eq("apt_name", complex.apt_name)
      .eq("region_code", complex.region_code)
      .order("trade_date", { ascending: false })
      .limit(50)
      .abortSignal(ac.signal);

    txns = (transactions ?? []) as Transaction[];

    // 전월세 이력 조회 (보조 DB)
    try {
      const rentDb = createRentServiceClient();
      const { data: rentData } = await rentDb
        .from("apt_rent_transactions")
        .select("id,size_sqm,floor,deposit,monthly_rent,rent_type,contract_type,trade_date")
        .eq("apt_name", complex.apt_name)
        .eq("region_code", complex.region_code)
        .order("trade_date", { ascending: false })
        .limit(200)
        .abortSignal(ac.signal);
      rentTxns = (rentData ?? []) as RentTransaction[];
    } catch {
      // rent DB 미설정 시 무시
    }

    // 같은 동네 다른 단지 조회
    if (complex.dong_name) {
      const { data: nearby } = await supabase
        .from("apt_complexes")
        .select("slug,apt_name,region_code,region_name,dong_name,built_year,total_units")
        .eq("dong_name", complex.dong_name)
        .neq("slug", slug)
        .limit(5)
        .abortSignal(ac.signal);
      nearbyComplexes = nearby ?? [];
    }

    clearTimeout(timer);
  } catch {
    clearTimeout(timer);
    // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
  }

  // 전세가율 계산
  const latestJeonse = rentTxns.find((r) => r.rent_type === "전세");
  const latestJeonseDeposit = latestJeonse?.deposit ?? 0;

  const prices = txns.map((t) => t.trade_price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const latestPrice = prices[0] ?? 0;

  const changeFromMax =
    maxPrice > 0 && latestPrice > 0
      ? (((latestPrice - maxPrice) / maxPrice) * 100).toFixed(1)
      : null;

  const sizeGroups = new Map<number, Transaction[]>();
  for (const t of txns) {
    const group = sizeGroups.get(t.size_sqm) ?? [];
    group.push(t);
    sizeGroups.set(t.size_sqm, group);
  }

  // 면적별 최고가 중 최대 (프로그레스 바용)
  const sizeEntries = Array.from(sizeGroups.entries()).sort((a, b) => a[0] - b[0]);
  const maxSizePrice = Math.max(
    ...sizeEntries.map(([, g]) => Math.max(...g.map((t) => t.trade_price))),
    1
  );

  const aptJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${complex.apt_name} 아파트`,
    description: `${complex.apt_name} - ${complex.region_name} ${complex.dong_name ?? ""} 아파트 실거래가 및 시세 정보`,
    url: `https://donjup.com/apt/${region}/${slug}`,
    ...(latestPrice > 0 && {
      offers: {
        "@type": "Offer",
        price: latestPrice * 10000,
        priceCurrency: "KRW",
      },
    }),
    address: {
      "@type": "PostalAddress",
      addressLocality: complex.region_name,
      addressRegion: complex.sido_name ?? "",
      addressCountry: "KR",
    },
    ...(complex.built_year && { yearBuilt: complex.built_year }),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aptJsonLd) }}
      />
      {/* 브레드크럼 */}
      <div className="mb-2 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        <Link href="/" className="hover:opacity-80">홈</Link>
        {" > "}
        <Link href="/market" className="hover:opacity-80">지역별</Link>
        {" > "}
        <span style={{ color: "var(--color-text-secondary)" }}>{complex.region_name}</span>
        {complex.dong_name && (
          <>
            {" > "}
            <span style={{ color: "var(--color-text-secondary)" }}>{complex.dong_name}</span>
          </>
        )}
      </div>

      {/* 단지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
            <h1 className="text-2xl font-extrabold t-text">{complex.apt_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton slug={slug} aptName={complex.apt_name} regionName={complex.region_name} />
            <NotifyButton aptName={complex.apt_name} />
            <ShareButtons
              url={`https://donjup.com/apt/${region}/${slug}`}
              title={`${complex.apt_name} 실거래가`}
              description={`${complex.apt_name} 최근 거래가 ${formatPrice(latestPrice)} | 돈줍`}
            />
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {complex.region_name} {complex.dong_name ?? ""}
          {complex.built_year ? ` · ${complex.built_year}년 준공` : ""}
          {complex.total_units ? ` · ${complex.total_units}세대` : ""}
          {complex.floor_count ? ` · ${complex.floor_count}층` : ""}
          {complex.parking_count ? ` · 주차 ${complex.parking_count}대` : ""}
          {complex.heating_method ? ` · ${complex.heating_method}` : ""}
        </p>

        {/* 건축물 상세 정보 */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          {complex.built_year && (() => {
            const currentYear = new Date().getFullYear();
            const age = currentYear - complex.built_year;
            const reconstructionYear = complex.built_year + 30;
            const yearsUntilReconstruction = reconstructionYear - currentYear;
            return (
              <>
                <span>{age}년차</span>
                <span>
                  재건축연한 {reconstructionYear}년
                  {yearsUntilReconstruction > 0
                    ? ` (${yearsUntilReconstruction}년 후)`
                    : " (도래)"}
                </span>
              </>
            );
          })()}
          {complex.floor_area_ratio && <span>용적률 {complex.floor_area_ratio}%</span>}
          {complex.building_coverage && <span>건폐율 {complex.building_coverage}%</span>}
          {complex.energy_grade && <span>에너지등급 {complex.energy_grade}</span>}
          {complex.elevator_count && <span>승강기 {complex.elevator_count}대</span>}
          {complex.land_area && <span>대지면적 {Number(complex.land_area).toLocaleString()}㎡</span>}
          {complex.total_floor_area && <span>연면적 {Number(complex.total_floor_area).toLocaleString()}㎡</span>}
        </div>
      </div>

      {/* 핵심 지표 카드 - Row 1 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-3">
        <StatCard label="최근 거래가" value={formatPrice(latestPrice)} />
        <StatCard label="역대 최고가" value={formatPrice(maxPrice)} />
        <StatCard label="역대 최저가" value={formatPrice(minPrice)} />
        <StatCard
          label="최고가 대비"
          value={changeFromMax ? `${changeFromMax}%` : "-"}
          accent={
            changeFromMax
              ? parseFloat(changeFromMax) < 0
                ? "drop"
                : "rise"
              : undefined
          }
        />
      </div>

      {/* 핵심 지표 카드 - Row 2 */}
      <div className="grid gap-3 grid-cols-2 mb-8">
        <StatCard label="최근 전세가" value={latestJeonseDeposit > 0 ? formatPrice(latestJeonseDeposit) : "-"} />
        <StatCard
          label="전세가율"
          value={
            latestPrice > 0 && latestJeonseDeposit > 0
              ? `${((latestJeonseDeposit / latestPrice) * 100).toFixed(1)}%`
              : "-"
          }
        />
      </div>

      {/* 가격 추이 차트 */}
      {txns.length >= 2 && (
        <div className="mb-8">
          <PriceHistoryChart
            transactions={txns.map((t) => ({
              trade_date: t.trade_date,
              trade_price: t.trade_price,
              size_sqm: t.size_sqm,
            }))}
          />
        </div>
      )}

      <AdSlot slotId="apt-detail-infeed" format="infeed" />

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* 좌측: 거래 이력 탭 */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold t-text">거래 이력</h2>
          <TransactionTabs saleTxns={txns} rentTxns={rentTxns} />
        </div>

        {/* 우측 사이드바 */}
        <aside className="space-y-6">
          {/* 면적별 시세 */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
            <h2 className="mb-4 font-bold t-text">면적별 시세</h2>
            <div className="space-y-4">
              {sizeEntries.map(([size, group]) => {
                const latest = group[0];
                const highest = Math.max(...group.map((g) => g.trade_price));
                const barWidth = Math.max((highest / maxSizePrice) * 100, 8);
                return (
                  <div key={size}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium t-text">{formatSizeWithPyeong(size)}</span>
                      <span className="font-bold tabular-nums t-text">{formatPrice(latest.trade_price)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--color-surface-elevated)" }}>
                        <div
                          className="h-1.5 rounded-full bg-brand-400"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums" style={{ color: "var(--color-text-tertiary)" }}>
                        최고 {formatPrice(highest)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 미니 대출 계산기 */}
          <MiniLoanCalculator defaultPrice={latestPrice > 0 ? latestPrice : 30000} />

          <CoupangBanner category="interior" title="새 집 인테리어 추천" className="hidden lg:block" />

          <AdSlot slotId="apt-sidebar-rect" format="rectangle" className="hidden lg:block" />
        </aside>
      </div>

      {/* 관련 뉴스 */}
      <div className="mt-8">
        <AptNews aptName={complex.apt_name} regionName={complex.region_name} />
      </div>

      {/* 댓글 */}
      <div className="mt-8">
        <Comments aptSlug={slug} />
      </div>

      {/* 같은 동네 다른 단지 */}
      {nearbyComplexes.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold t-text">같은 동네 다른 단지</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {nearbyComplexes.map((nc) => (
              <Link
                key={nc.slug}
                href={`/apt/${nc.region_code}/${nc.slug}`}
                className="card-hover rounded-2xl border p-4 transition-colors"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
              >
                <p className="font-bold t-text text-sm truncate">{nc.apt_name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {nc.dong_name ?? nc.region_name}
                  {nc.built_year ? ` · ${nc.built_year}년` : ""}
                </p>
                {nc.total_units && (
                  <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    {nc.total_units}세대
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "drop" | "rise";
}) {
  const accentColor = accent === "drop"
    ? "var(--color-semantic-drop)"
    : accent === "rise"
      ? "var(--color-semantic-rise)"
      : "var(--color-text-primary)";

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
      <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums" style={{ color: accentColor }}>{value}</p>
    </div>
  );
}
