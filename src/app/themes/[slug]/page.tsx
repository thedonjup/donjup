import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice, formatRegion } from "@/lib/format";
import { aptUrl } from "@/lib/apt-url";
import AdSlot from "@/components/ads/AdSlot";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  THEME_IDS,
  getCachedThemeResults,
  getThemeDefinition,
  type ThemeResult,
} from "@/lib/theme-query";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

// ---------- Static params ----------

export function generateStaticParams() {
  return THEME_IDS.map((slug) => ({ slug }));
}

// ---------- Metadata ----------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const theme = getThemeDefinition(slug);
  if (!theme) return {};

  return {
    title: theme.metaTitle,
    description: theme.metaDescription,
    alternates: { canonical: `/themes/${slug}` },
    openGraph: {
      title: theme.metaTitle,
      description: theme.metaDescription,
    },
  };
}

// ---------- Page ----------

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const theme = getThemeDefinition(slug);
  if (!theme) notFound();

  let results: ThemeResult[] = [];

  try {
    results = await getCachedThemeResults(theme.id, 50);
  } catch (e) {
    logDatabaseFailure("Theme detail query failed", e, {
      route: "/themes/[slug]",
      slug,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "테마 컬렉션", href: "/themes" },
          { name: theme.title, href: `/themes/${slug}` },
        ]}
      />
      {results.length > 0 && (
        <ItemListJsonLd
          name={`${theme.title} 아파트 목록`}
          items={results.slice(0, 10).map((item, i) => ({
            name: `${item.apt_name} (${formatRegion(item.region_code)})`,
            url: `https://donjup.com${aptUrl({ govtComplexId: item.govt_complex_id ?? null, regionCode: item.region_code, slug: item.slug ?? '' })}`,
            position: i + 1,
          }))}
        />
      )}

      {/* Header */}
      <section className="mb-8">
        <Link
          href="/themes"
          className="mb-4 inline-flex items-center gap-1 text-sm t-text-secondary hover:t-text transition"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          테마 컬렉션
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${theme.bgColor}`}
            role="img"
          >
            {theme.icon}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
              {theme.title}
            </h1>
            <p className="mt-1 text-sm t-text-secondary">{theme.description}</p>
          </div>
        </div>
      </section>

      <AdSlot slotId="theme-detail-top" format="infeed" className="my-6" />

      {/* Results */}
      {results.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">해당 테마에 맞는 데이터가 없습니다</p>
          <p className="mt-1 text-sm t-text-tertiary">
            데이터가 수집되면 자동으로 표시됩니다
          </p>
        </div>
      ) : theme.id === "crash-deals" ? (
        /* 폭락 매물: 거래 기반 */
        <div className="overflow-x-auto rounded-2xl border t-border t-card">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래가</th>
                <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">하락률</th>
                <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">거래일</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, i) => (
                <tr
                  key={`${item.id}-${i}`}
                  className="transition hover:bg-[var(--color-surface-elevated)]"
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <td className="px-4 py-3 tabular-nums t-text-tertiary">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={aptUrl({ govtComplexId: item.govt_complex_id ?? null, regionCode: item.region_code, slug: item.slug ?? '' })}
                      className="font-semibold t-text hover:text-brand-600 transition"
                    >
                      {item.apt_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 t-text-secondary">{formatRegion(item.region_code)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums t-text">
                    {item.trade_price ? formatPrice(item.trade_price) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums t-drop">
                    {item.change_rate != null ? `${Number(item.change_rate).toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums t-text-tertiary">
                    {item.trade_date ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 단지 기반 테마 */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item, i) => (
            <Link
              key={`${item.id}-${i}`}
              href={aptUrl({ govtComplexId: item.govt_complex_id ?? null, regionCode: item.region_code, slug: item.slug ?? '' })}
              className="card-hover block rounded-2xl border t-border p-5 transition"
              style={{ background: "var(--color-surface-card)" }}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold t-text truncate">{item.apt_name}</p>
                <span className="ml-2 rounded-full t-elevated px-2 py-0.5 text-xs tabular-nums t-text-secondary">
                  #{i + 1}
                </span>
              </div>
              <p className="mt-1 text-xs t-text-tertiary">{formatRegion(item.region_code)}</p>
              <div className="mt-3 flex items-center gap-3 text-xs t-text-secondary">
                {item.built_year && <span>{item.built_year}년 준공</span>}
                {item.total_units && (
                  <span>{item.total_units.toLocaleString()}세대</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
