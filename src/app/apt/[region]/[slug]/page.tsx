import { db } from "@/lib/db";
import { aptTransactions, aptComplexes, aptRentTransactions } from "@/lib/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import CoupangBanner from "@/components/CoupangBanner";
import ShareButtons from "@/components/ShareButtons";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";
import AptDetailClient, { type AptTransaction, type AptRentTransaction } from "@/components/apt/AptDetailClient";
import NotifyButton from "@/components/apt/NotifyButton";
import FavoriteButton from "@/components/apt/FavoriteButton";
import MiniLoanCalculator from "@/components/apt/MiniLoanCalculator";
import AptNews from "@/components/apt/AptNews";
import Comments from "@/components/apt/Comments";
import ViewDetailTracker from "@/components/analytics/ViewDetailTracker";

export const revalidate = 3600;

type Transaction = AptTransaction;
type RentTransaction = AptRentTransaction;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, region } = await params;
  const decodedSlug = decodeURIComponent(slug);

  type MetaComplex = { apt_name: string; region_name: string; dong_name: string | null; region_code: string; slug: string };
  let complex: MetaComplex | null = null;

  const exactMatch = await db.select({
    apt_name: aptComplexes.aptName,
    region_name: aptComplexes.regionName,
    dong_name: aptComplexes.dongName,
    region_code: aptComplexes.regionCode,
    slug: aptComplexes.slug,
  }).from(aptComplexes).where(eq(aptComplexes.slug, decodedSlug)).limit(1);

  if (exactMatch[0]) {
    complex = exactMatch[0];
  }

  // Fallback: parse region_code from slug and search by region
  if (!complex) {
    const dashIdx = decodedSlug.indexOf("-");
    if (dashIdx > 0) {
      const regionCode = decodedSlug.substring(0, dashIdx);
      const aptSlugPart = decodedSlug.substring(dashIdx + 1);
      const fallbackList = await db.select({
        apt_name: aptComplexes.aptName,
        region_name: aptComplexes.regionName,
        dong_name: aptComplexes.dongName,
        slug: aptComplexes.slug,
        region_code: aptComplexes.regionCode,
      }).from(aptComplexes).where(eq(aptComplexes.regionCode, regionCode)).limit(50);

      if (fallbackList.length > 0) {
        const found = fallbackList.find((c) => {
          const s = c.slug ?? "";
          const dbDash = s.indexOf("-");
          const dbSuffix = dbDash > 0 ? s.substring(dbDash + 1) : s;
          return dbSuffix === aptSlugPart || s === decodedSlug;
        });
        if (found) complex = found;
      }
    }
  }

  if (!complex) {
    return { title: "단지 정보" };
  }

  // 최근 거래가 및 최고가 조회 (OG 태그에 가격 변동 정보 포함)
  const latestTxnRows = await db.select({
    trade_price: aptTransactions.tradePrice,
    highest_price: aptTransactions.highestPrice,
    change_rate: aptTransactions.changeRate,
  }).from(aptTransactions)
    .where(and(
      eq(aptTransactions.aptName, complex.apt_name),
      eq(aptTransactions.regionCode, complex.region_code),
    ))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(1);

  const latestTxn = latestTxnRows[0] ?? null;
  const changeRate = latestTxn ? Number(latestTxn.change_rate) : null;
  const tradePrice = latestTxn ? Number(latestTxn.trade_price) : null;
  const highestPrice = latestTxn ? latestTxn.highest_price : null;

  const complexAptName = complex.apt_name;
  const complexRegionName = complex.region_name;
  const complexDongName = complex.dong_name;

  // 감정 자극형 타이틀
  const priceLabel = tradePrice ? formatPrice(tradePrice) : "";
  const highLabel = highestPrice ? formatPrice(Number(highestPrice)) : "";

  let ogTitle: string;
  let ogDescription: string;

  if (changeRate !== null && changeRate < 0) {
    ogTitle = `${complexAptName} ${changeRate.toFixed(1)}% 폭락 | 돈줍`;
    ogDescription = highLabel && priceLabel
      ? `최고가 ${highLabel} → 현재 ${priceLabel} | 매일 업데이트되는 실거래가`
      : `${complexAptName} 아파트 실거래가 시세를 확인하세요 | 돈줍`;
  } else if (priceLabel) {
    ogTitle = `${complexAptName} ${priceLabel} | 돈줍`;
    ogDescription = `${complexRegionName} ${complexDongName ?? ""} · 매일 업데이트되는 실거래가`;
  } else {
    ogTitle = `${complexAptName} 실거래가 | 돈줍`;
    ogDescription = `${complexRegionName} ${complexDongName ?? ""} 아파트 실거래가 시세를 확인하세요`;
  }

  const pageUrl = `https://donjup.com/apt/${region}/${slug}`;
  const ogImageUrl = `https://donjup.com/apt/${region}/${slug}/opengraph-image`;

  const seoTitle = `${complexAptName} 실거래가 - ${complexRegionName} ${complexDongName ?? ""}`;
  return {
    title: seoTitle,
    description: `${complexAptName} 아파트 실거래가 시세, 최고가 대비 변동률, 거래 이력을 확인하세요. ${complexRegionName} ${complexDongName ?? ""} 매매·전월세 시세 비교.`,
    alternates: { canonical: `/apt/${region}/${slug}` },
    keywords: [
      `${complexAptName} 실거래가`,
      `${complexAptName} 시세`,
      `${complexAptName} 아파트`,
      `${complexRegionName} 아파트`,
      "아파트 실거래가",
      "아파트 시세 조회",
    ],
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: pageUrl,
      siteName: "돈줍 DonJup",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
      locale: "ko_KR",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImageUrl],
    },
  };
}

export default async function AptDetailPage({
  params,
}: {
  params: Promise<{ region: string; slug: string }>;
}) {
  const { slug, region } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // Try exact slug match first
  const complexRows = await db.select().from(aptComplexes)
    .where(eq(aptComplexes.slug, decodedSlug))
    .limit(1);

  let complex = complexRows[0] ?? null;

  // Fallback: parse region_code and apt_name from slug and query by those
  if (!complex) {
    const dashIdx = decodedSlug.indexOf("-");
    if (dashIdx > 0) {
      const regionCode = decodedSlug.substring(0, dashIdx);
      const aptSlugPart = decodedSlug.substring(dashIdx + 1);
      const fallbackList = await db.select().from(aptComplexes)
        .where(eq(aptComplexes.regionCode, regionCode))
        .limit(50);

      if (fallbackList.length > 0) {
        const found = fallbackList.find((c) => {
          const s = c.slug ?? "";
          const dbDash = s.indexOf("-");
          const dbSuffix = dbDash > 0 ? s.substring(dbDash + 1) : s;
          return dbSuffix === aptSlugPart || s === decodedSlug;
        });
        if (found) complex = found;
      }
    }
  }

  if (!complex) {
    notFound();
  }

  let txns: Transaction[] = [];
  let rentTxns: RentTransaction[] = [];
  let nearbyComplexes: { slug: string; apt_name: string; region_code: string; region_name: string; dong_name: string | null; built_year: number | null; total_units: number | null }[] = [];

  try {
    const transactions = await db.select({
      id: aptTransactions.id,
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
    }).from(aptTransactions)
      .where(and(
        eq(aptTransactions.aptName, complex.aptName),
        eq(aptTransactions.regionCode, complex.regionCode),
      ))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(50);

    txns = transactions as unknown as Transaction[];

    // 전월세 이력 조회 — same db instance handles all tables
    try {
      const rentData = await db.select({
        id: aptRentTransactions.id,
        size_sqm: aptRentTransactions.sizeSqm,
        floor: aptRentTransactions.floor,
        deposit: aptRentTransactions.deposit,
        monthly_rent: aptRentTransactions.monthlyRent,
        rent_type: aptRentTransactions.rentType,
        contract_type: aptRentTransactions.contractType,
        trade_date: aptRentTransactions.tradeDate,
      }).from(aptRentTransactions)
        .where(and(
          eq(aptRentTransactions.aptName, complex.aptName),
          eq(aptRentTransactions.regionCode, complex.regionCode),
        ))
        .orderBy(desc(aptRentTransactions.tradeDate))
        .limit(200);
      rentTxns = rentData as unknown as RentTransaction[];
    } catch {
      // rent data unavailable — ignore
    }

    // 같은 동네 다른 단지 조회
    if (complex.dongName) {
      const nearby = await db.select({
        slug: aptComplexes.slug,
        apt_name: aptComplexes.aptName,
        region_code: aptComplexes.regionCode,
        region_name: aptComplexes.regionName,
        dong_name: aptComplexes.dongName,
        built_year: aptComplexes.builtYear,
        total_units: aptComplexes.totalUnits,
      }).from(aptComplexes)
        .where(and(
          eq(aptComplexes.dongName, complex.dongName),
          ne(aptComplexes.slug, slug),
        ))
        .limit(5);
      nearbyComplexes = nearby as unknown as typeof nearbyComplexes;
    }
  } catch {
    // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
  }

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
    name: `${complex.aptName} 아파트`,
    description: `${complex.aptName} - ${complex.regionName} ${complex.dongName ?? ""} 아파트 실거래가 및 시세 정보`,
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
      addressLocality: complex.regionName,
      addressRegion: complex.sidoName ?? "",
      addressCountry: "KR",
    },
    ...(complex.builtYear && { yearBuilt: complex.builtYear }),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ViewDetailTracker contentType="apt" contentId={slug} />
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
        <span style={{ color: "var(--color-text-secondary)" }}>{complex.regionName}</span>
        {complex.dongName && (
          <>
            {" > "}
            <span style={{ color: "var(--color-text-secondary)" }}>{complex.dongName}</span>
          </>
        )}
      </div>

      {/* 단지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
            <h1 className="text-2xl font-extrabold t-text">{complex.aptName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton slug={slug} aptName={complex.aptName} regionName={complex.regionName} />
            <NotifyButton aptName={complex.aptName} />
            <ShareButtons
              url={`https://donjup.com/apt/${region}/${slug}`}
              title={`${complex.aptName} 실거래가`}
              description={`${complex.aptName} 최근 거래가 ${formatPrice(latestPrice)} | 돈줍`}
            />
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {complex.regionName} {complex.dongName ?? ""}
          {complex.builtYear ? ` · ${complex.builtYear}년 준공` : ""}
          {complex.totalUnits ? ` · ${complex.totalUnits}세대` : ""}
          {complex.floorCount ? ` · ${complex.floorCount}층` : ""}
          {complex.parkingCount ? ` · 주차 ${complex.parkingCount}대` : ""}
          {complex.heatingMethod ? ` · ${complex.heatingMethod}` : ""}
        </p>

        {/* 건축물 상세 정보 */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          {complex.builtYear && (() => {
            const currentYear = new Date().getFullYear();
            const age = currentYear - complex.builtYear!;
            const reconstructionYear = complex.builtYear! + 30;
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
          {complex.floorAreaRatio && <span>용적률 {complex.floorAreaRatio}%</span>}
          {complex.buildingCoverage && <span>건폐율 {complex.buildingCoverage}%</span>}
          {complex.energyGrade && <span>에너지등급 {complex.energyGrade}</span>}
          {complex.elevatorCount && <span>승강기 {complex.elevatorCount}대</span>}
          {complex.landArea && <span>대지면적 {Number(complex.landArea).toLocaleString()}㎡</span>}
          {complex.totalFloorArea && <span>연면적 {Number(complex.totalFloorArea).toLocaleString()}㎡</span>}
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

      {/* 면적 선택 + 가격 추이 차트 + 거래 이력 (통합 상태 관리) */}
      <AptDetailClient saleTxns={txns} rentTxns={rentTxns} />

      <AdSlot slotId="apt-detail-infeed" format="infeed" className="mt-6" />

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* 우측 사이드바 */}
        <aside className="space-y-6 lg:col-start-3">
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
        <AptNews aptName={complex.aptName} regionName={complex.regionName} />
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
