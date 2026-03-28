import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";
import { desc, asc, lte, gte } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 3600;

// ---------- 테마 정의 ----------

interface ThemeDef {
  id: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  icon: string;
  color: string;
  bgColor: string;
}

const THEMES: Record<string, ThemeDef> = {
  reconstruction: {
    id: "reconstruction",
    title: "재건축 임박",
    description: "준공 30년 이상, 재건축 가능성이 높은 단지",
    metaTitle: "재건축 임박 아파트 - 준공 30년 이상 단지 모음",
    metaDescription:
      "준공 30년 이상으로 재건축 가능성이 높은 전국 아파트 단지 목록. 재건축 투자 참고 자료를 확인하세요.",
    icon: "🏗️",
    color: "text-amber-600",
    bgColor: "theme-bg-amber",
  },
  "large-complex": {
    id: "large-complex",
    title: "대단지 (1,000세대+)",
    description: "1,000세대 이상 대규모 단지",
    metaTitle: "대단지 아파트 - 1,000세대 이상 대규모 단지",
    metaDescription:
      "전국 1,000세대 이상 대단지 아파트 목록. 대단지만의 인프라와 커뮤니티 장점을 비교해보세요.",
    icon: "🏢",
    color: "text-blue-600",
    bgColor: "theme-bg-blue",
  },
  "new-build": {
    id: "new-build",
    title: "신축 (2020년 이후)",
    description: "2020년 이후 준공된 신축 단지",
    metaTitle: "신축 아파트 - 2020년 이후 준공 단지",
    metaDescription:
      "2020년 이후 준공된 전국 신축 아파트 단지 목록. 최신 설계와 시설을 갖춘 단지를 확인하세요.",
    icon: "✨",
    color: "text-emerald-600",
    bgColor: "theme-bg-emerald",
  },
  "crash-deals": {
    id: "crash-deals",
    title: "폭락 매물",
    description: "최고가 대비 20% 이상 하락한 거래",
    metaTitle: "폭락 매물 - 최고가 대비 20% 이상 하락 거래",
    metaDescription:
      "역대 최고가 대비 20% 이상 하락한 전국 아파트 실거래 내역. 급매 타이밍을 확인하세요.",
    icon: "📉",
    color: "text-red-600",
    bgColor: "theme-bg-red",
  },
};

const VALID_SLUGS = Object.keys(THEMES);

// ---------- Static params ----------

export function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

// ---------- Metadata ----------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const theme = THEMES[slug];
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

// ---------- Data types ----------

interface ThemeResult {
  id: string;
  apt_name: string;
  region_code: string;
  region_name: string;
  slug?: string;
  built_year?: number | null;
  total_units?: number | null;
  trade_price?: number;
  change_rate?: number | null;
  trade_date?: string;
}

function makeSlug(regionCode: string, aptName: string): string {
  return `${regionCode}-${aptName
    .replace(/[^가-힣a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}`;
}

// ---------- Page ----------

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = THEMES[slug];
  if (!theme) notFound();

  let results: ThemeResult[] = [];

  try {
    const currentYear = new Date().getFullYear();

    if (slug === "reconstruction") {
      const cutoffYear = currentYear - 30;
      const data = await db.select({
        id: aptComplexes.id,
        apt_name: aptComplexes.aptName,
        region_code: aptComplexes.regionCode,
        region_name: aptComplexes.regionName,
        slug: aptComplexes.slug,
        built_year: aptComplexes.builtYear,
        total_units: aptComplexes.totalUnits,
      }).from(aptComplexes)
        .where(lte(aptComplexes.builtYear, cutoffYear))
        .orderBy(asc(aptComplexes.builtYear))
        .limit(50);
      results = data as unknown as ThemeResult[];
    } else if (slug === "large-complex") {
      const data = await db.select({
        id: aptComplexes.id,
        apt_name: aptComplexes.aptName,
        region_code: aptComplexes.regionCode,
        region_name: aptComplexes.regionName,
        slug: aptComplexes.slug,
        built_year: aptComplexes.builtYear,
        total_units: aptComplexes.totalUnits,
      }).from(aptComplexes)
        .where(gte(aptComplexes.totalUnits, 1000))
        .orderBy(desc(aptComplexes.totalUnits))
        .limit(50);
      results = data as unknown as ThemeResult[];
    } else if (slug === "new-build") {
      const data = await db.select({
        id: aptComplexes.id,
        apt_name: aptComplexes.aptName,
        region_code: aptComplexes.regionCode,
        region_name: aptComplexes.regionName,
        slug: aptComplexes.slug,
        built_year: aptComplexes.builtYear,
        total_units: aptComplexes.totalUnits,
      }).from(aptComplexes)
        .where(gte(aptComplexes.builtYear, 2020))
        .orderBy(desc(aptComplexes.builtYear))
        .limit(50);
      results = data as unknown as ThemeResult[];
    } else if (slug === "crash-deals") {
      const data = await db.select({
        id: aptTransactions.id,
        apt_name: aptTransactions.aptName,
        region_code: aptTransactions.regionCode,
        region_name: aptTransactions.regionName,
        trade_price: aptTransactions.tradePrice,
        change_rate: aptTransactions.changeRate,
        trade_date: aptTransactions.tradeDate,
      }).from(aptTransactions)
        .where(lte(aptTransactions.changeRate, "-20"))
        .orderBy(asc(aptTransactions.changeRate))
        .limit(50);
      results = data.map((r) => ({
        ...r,
        trade_price: Number(r.trade_price),
        change_rate: r.change_rate !== null ? Number(r.change_rate) : null,
      }));
    }
  } catch (e) {
    console.error("[ThemeDetail] query failed:", e);
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
            name: `${item.apt_name} (${item.region_name})`,
            url: `https://donjup.com/apt/${item.region_code}/${item.slug ?? makeSlug(item.region_code, item.apt_name)}`,
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
      ) : slug === "crash-deals" ? (
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
                      href={`/apt/${item.region_code}/${makeSlug(item.region_code, item.apt_name)}`}
                      className="font-semibold t-text hover:text-brand-600 transition"
                    >
                      {item.apt_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 t-text-secondary">{item.region_name}</td>
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
              href={`/apt/${item.region_code}/${item.slug ?? makeSlug(item.region_code, item.apt_name)}`}
              className="card-hover block rounded-2xl border t-border p-5 transition"
              style={{ background: "var(--color-surface-card)" }}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold t-text truncate">{item.apt_name}</p>
                <span className="ml-2 rounded-full t-elevated px-2 py-0.5 text-xs tabular-nums t-text-secondary">
                  #{i + 1}
                </span>
              </div>
              <p className="mt-1 text-xs t-text-tertiary">{item.region_name}</p>
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
