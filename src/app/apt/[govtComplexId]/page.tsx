import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import CoupangBanner from "@/components/CoupangBanner";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  aptDetailUnavailableMetadata,
  detailUnavailableStates,
} from "@/lib/detail-data-state";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";
import AptDetailClient from "@/components/apt/AptDetailClient";
import { aptUrl, shouldRedirectToAptCanonical } from "@/lib/apt-url";
import {
  getCachedAptDetailComplexByGovtId,
  getCachedAptDetailNearbyComplexes,
  getCachedAptDetailRentTransactions,
  getCachedAptDetailSaleTransactions,
  type AptDetailComplex,
  type AptDetailNearbyComplex,
  type AptDetailRentTransaction,
  type AptDetailSaleTransaction,
} from "@/lib/apt-detail-query";
import AptDetailActions from "@/components/apt/AptDetailActions";
import AptDecisionSummary from "@/components/apt/AptDecisionSummary";
import AptDetailUnavailable from "@/components/apt/AptDetailUnavailable";
import MiniLoanCalculator from "@/components/apt/MiniLoanCalculator";
import AptNews from "@/components/apt/AptNews";
import Comments from "@/components/apt/Comments";
import ViewDetailTracker from "@/components/analytics/ViewDetailTracker";

export const revalidate = 3600;

type Transaction = AptDetailSaleTransaction;
type RentTransaction = AptDetailRentTransaction;
type AptComplex = AptDetailComplex;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ govtComplexId: string }>;
}): Promise<Metadata> {
  const { govtComplexId } = await params;
  try {
    const complex = await getCachedAptDetailComplexByGovtId(govtComplexId);

    if (!complex) {
      return { title: "단지 정보 | 돈줍" };
    }

  const latestTxn = (await getCachedAptDetailSaleTransactions(
    complex.id,
    complex.aptName,
    complex.regionCode,
    complex.propertyType,
  ))[0] ?? null;
  const changeRate = latestTxn?.change_rate ?? null;
  const tradePrice = latestTxn?.trade_price ?? null;
  const highestPrice = latestTxn?.highest_price ?? null;

  const complexAptName = complex.aptName;
  const complexRegionName = complex.regionName;
  const complexDongName = complex.dongName;

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

  const pageUrl = `https://donjup.com/apt/${govtComplexId}`;
  const ogImageUrl = `https://donjup.com/apt/${govtComplexId}/opengraph-image`;

  const seoTitle = `${complexAptName} 실거래가 - ${complexRegionName} ${complexDongName ?? ""}`;
  return {
    title: seoTitle,
    description: `${complexAptName} 아파트 실거래가 시세, 최고가 대비 변동률, 거래 이력을 확인하세요. ${complexRegionName} ${complexDongName ?? ""} 매매·전월세 시세 비교.`,
    alternates: { canonical: `/apt/${govtComplexId}` },
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
  } catch (err) {
    logDatabaseFailure("apt detail metadata query failed", err, {
      route: "/apt/[govtComplexId]",
      govtComplexId,
    });
    return aptDetailUnavailableMetadata(`/apt/${govtComplexId}`);
  }
}

export default async function AptDetailPage({
  params,
}: {
  params: Promise<{ govtComplexId: string }>;
}) {
  const { govtComplexId } = await params;

  let complex: AptComplex | null = null;
  let complexLookupUnavailable = false;

  try {
    complex = await getCachedAptDetailComplexByGovtId(govtComplexId);
  } catch (err) {
    complexLookupUnavailable = true;
    logDatabaseFailure("apt detail complex lookup failed", err, {
      route: "/apt/[govtComplexId]",
      govtComplexId,
    });
  }

  if (complexLookupUnavailable) {
    return <AptDetailUnavailable retryPath={`/apt/${govtComplexId}`} />;
  }

  if (!complex) {
    notFound();
  }

  const detailContentId = complex.govtComplexId ?? complex.slug;
  const detailPath = aptUrl({
    govtComplexId: complex.govtComplexId,
    regionCode: complex.regionCode,
    slug: complex.slug,
  });

  if (shouldRedirectToAptCanonical(`/apt/${govtComplexId}`, detailPath)) {
    permanentRedirect(detailPath);
  }

  let txns: Transaction[] = [];
  let rentTxns: RentTransaction[] = [];
  let nearbyComplexes: AptDetailNearbyComplex[] = [];
  let saleDataUnavailable = false;
  let rentDataUnavailable = false;
  let nearbyDataUnavailable = false;

  try {
    txns = await getCachedAptDetailSaleTransactions(
      complex.id,
      complex.aptName,
      complex.regionCode,
      complex.propertyType,
    );
  } catch (err) {
    saleDataUnavailable = true;
    logDatabaseFailure("apt detail sale transaction query failed", err, {
      route: "/apt/[govtComplexId]",
      govtComplexId,
      complexId: complex.id,
    });
  }

  try {
    rentTxns = await getCachedAptDetailRentTransactions(
      complex.aptName,
      complex.regionCode,
    );
  } catch (err) {
    rentDataUnavailable = true;
    logDatabaseFailure("apt detail rent transaction query failed", err, {
      route: "/apt/[govtComplexId]",
      govtComplexId,
      complexId: complex.id,
    });
  }

  if (complex.dongName) {
    try {
      nearbyComplexes = await getCachedAptDetailNearbyComplexes(
        complex.id,
        complex.dongName,
      );
    } catch (err) {
      nearbyDataUnavailable = true;
      logDatabaseFailure("apt detail nearby complex query failed", err, {
        route: "/apt/[govtComplexId]",
        govtComplexId,
        complexId: complex.id,
      });
    }
  }

  const prices = txns.map((t) => t.trade_price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const latestPrice = prices[0] ?? 0;
  const latestTxn = txns[0] ?? null;

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

  const sizeEntries = Array.from(sizeGroups.entries()).sort((a, b) => a[0] - b[0]);
  const maxSizePrice = Math.max(
    ...sizeEntries.map(([, g]) => Math.max(...g.map((t) => t.trade_price))),
    1
  );
  const detailUnavailableCopies = detailUnavailableStates({
    sale: saleDataUnavailable,
    rent: rentDataUnavailable,
    nearby: nearbyDataUnavailable,
  });

  const aptJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${complex.aptName} 아파트`,
    description: `${complex.aptName} - ${complex.regionName} ${complex.dongName ?? ""} 아파트 실거래가 및 시세 정보`,
    url: `https://donjup.com${detailPath}`,
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
      <ViewDetailTracker contentType="apt" contentId={detailContentId} aptName={complex.aptName} regionName={complex.regionName} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aptJsonLd) }}
      />

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

      <div className="mb-8">
        <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
            <h1 className="text-2xl font-extrabold t-text">{complex.aptName}</h1>
          </div>
          <AptDetailActions
            aptName={complex.aptName}
            regionName={complex.regionName}
            contentId={detailContentId}
            complexId={complex.id}
            detailUrl={detailPath}
            latestPrice={latestPrice}
            hasLocation={complex.latitude !== null && complex.longitude !== null}
          />
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {complex.regionName} {complex.dongName ?? ""}
          {complex.builtYear ? ` · ${complex.builtYear}년 준공` : ""}
          {complex.totalUnits ? ` · ${complex.totalUnits}세대` : ""}
        </p>
      </div>

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

      {detailUnavailableCopies.length > 0 && (
        <div className="mb-4 grid gap-3">
          {detailUnavailableCopies.map((copy) => (
            <div
              key={copy.kind}
              role="status"
              className="rounded-2xl border p-4 text-sm"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-card)",
                color: "var(--color-text-secondary)",
              }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {copy.title}
              </p>
              <p className="mt-1 text-xs">{copy.description}</p>
            </div>
          ))}
        </div>
      )}

      <AptDecisionSummary
        aptName={complex.aptName}
        complexId={complex.id}
        latestPrice={latestPrice}
        highestPrice={maxPrice}
        changeFromMax={changeFromMax}
        latestSize={latestTxn?.size_sqm ?? null}
        latestFloor={latestTxn?.floor ?? null}
        rentCount={rentTxns.length}
        nearbyCount={nearbyComplexes.length}
      />

      <AptDetailClient saleTxns={txns} rentTxns={rentTxns} />

      <AdSlot slotId="apt-detail-infeed" format="infeed" className="mt-6" />

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <aside className="space-y-6 lg:col-start-3">
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
            <h2 className="mb-4 font-bold t-text">면적별 시세</h2>
            <div className="space-y-4">
              {sizeEntries.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                  {saleDataUnavailable
                    ? "면적별 시세를 불러오지 못했습니다."
                    : "아직 표시할 매매 거래가 없습니다."}
                </p>
              ) : (
                sizeEntries.map(([size, group]) => {
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
                })
              )}
            </div>
          </div>

          <MiniLoanCalculator defaultPrice={latestPrice > 0 ? latestPrice : 30000} />
          <CoupangBanner category="interior" title="새 집 인테리어 추천" className="hidden lg:block" />
        </aside>
      </div>

      <div className="mt-8">
        <AptNews aptName={complex.aptName} regionName={complex.regionName} />
      </div>

      <div className="mt-8">
        <Comments aptSlug={detailContentId} />
      </div>

      {nearbyComplexes.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold t-text">같은 동네 다른 단지</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {nearbyComplexes.map((nc) => (
              <Link
                key={nc.slug}
                href={aptUrl({ govtComplexId: nc.govt_complex_id, regionCode: nc.region_code, slug: nc.slug })}
                className="card-hover rounded-2xl border p-4 transition-colors"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
              >
                <p className="font-bold t-text text-sm truncate">{nc.apt_name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {nc.dong_name ?? nc.region_name}
                </p>
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
