import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";
import { desc, asc, lte, gte } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { formatPrice } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "테마 컬렉션 - 투자 관점별 아파트 모아보기",
  description:
    "재건축 임박, 대단지, 신축, 폭락 매물 등 투자 테마별로 아파트를 모아봅니다. 돈줍에서 테마별 아파트를 한눈에 비교하세요.",
  keywords: [
    "재건축 아파트",
    "대단지 아파트",
    "신축 아파트",
    "아파트 폭락",
    "부동산 테마",
    "아파트 투자",
    "테마 컬렉션",
  ],
  alternates: { canonical: "/themes" },
};

interface ThemeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

const THEMES: ThemeDef[] = [
  {
    id: "reconstruction",
    title: "재건축 임박",
    description: "준공 30년 이상, 재건축 가능성이 높은 단지",
    icon: "🏗️",
    color: "text-amber-600",
    bgColor: "theme-bg-amber",
  },
  {
    id: "large-complex",
    title: "대단지 (1,000세대+)",
    description: "1,000세대 이상 대규모 단지",
    icon: "🏢",
    color: "text-blue-600",
    bgColor: "theme-bg-blue",
  },
  {
    id: "new-build",
    title: "신축 (2020년 이후)",
    description: "2020년 이후 준공된 신축 단지",
    icon: "✨",
    color: "text-emerald-600",
    bgColor: "theme-bg-emerald",
  },
  {
    id: "crash-deals",
    title: "폭락 매물",
    description: "최고가 대비 20% 이상 하락한 거래",
    icon: "📉",
    color: "text-red-600",
    bgColor: "theme-bg-red",
  },
];

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

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { theme: themeParam } = await searchParams;
  const selectedTheme = typeof themeParam === "string" ? themeParam : null;

  let results: ThemeResult[] = [];
  let activeTheme: ThemeDef | null = null;

  if (selectedTheme) {
    activeTheme = THEMES.find((t) => t.id === selectedTheme) ?? null;

    if (activeTheme) {
      try {
        const currentYear = new Date().getFullYear();

        if (selectedTheme === "reconstruction") {
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
            .limit(30);
          results = data as unknown as ThemeResult[];
        } else if (selectedTheme === "large-complex") {
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
            .limit(30);
          results = data as unknown as ThemeResult[];
        } else if (selectedTheme === "new-build") {
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
            .limit(30);
          results = data as unknown as ThemeResult[];
        } else if (selectedTheme === "crash-deals") {
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
            .limit(30);
          results = data.map((r) => ({
            ...r,
            trade_price: Number(r.trade_price),
            change_rate: r.change_rate !== null ? Number(r.change_rate) : null,
          }));
        }
      } catch (e) {
        console.error("[Themes] query failed:", e);
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
            테마 컬렉션
          </h1>
        </div>
        <p className="mt-2 text-sm t-text-secondary">
          투자 관점별로 아파트를 모아봅니다. 관심 테마를 선택하세요.
        </p>
      </section>

      {/* Theme Cards */}
      <section className="mb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((theme) => (
            <Link
              key={theme.id}
              href={`/themes?theme=${theme.id}`}
              className={`card-hover block rounded-2xl border p-5 transition ${
                selectedTheme === theme.id
                  ? "border-brand-500 ring-2 ring-brand-200"
                  : "t-border"
              }`}
              style={{ background: "var(--color-surface-card)" }}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${theme.bgColor}`} role="img">
                  {theme.icon}
                </span>
                <div>
                  <h2 className="text-sm font-bold t-text">{theme.title}</h2>
                  <p className="mt-0.5 text-xs t-text-tertiary">{theme.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <AdSlot slotId="themes-infeed" format="infeed" className="my-6" />

      {/* Results */}
      {selectedTheme && activeTheme && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">{activeTheme.icon}</span>
            <h2 className="text-lg font-bold t-text">{activeTheme.title}</h2>
            <span className="text-xs t-text-tertiary">
              {results.length}건
            </span>
          </div>

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
          ) : selectedTheme === "crash-deals" ? (
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
                          href={`/apt/${item.region_code}/${item.region_code}-${(item.apt_name ?? "").replace(/[^가-힣a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`}
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
                  href={`/apt/${item.region_code}/${item.slug ?? `${item.region_code}-${(item.apt_name ?? "").replace(/[^가-힣a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`}`}
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
                    {item.built_year && (
                      <span>{item.built_year}년 준공</span>
                    )}
                    {item.total_units && (
                      <span>{item.total_units.toLocaleString()}세대</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* No theme selected */}
      {!selectedTheme && (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">테마를 선택하세요</p>
          <p className="mt-1 text-sm t-text-tertiary">
            위의 테마 카드를 클릭하면 해당 조건의 아파트 목록이 표시됩니다
          </p>
        </div>
      )}
    </div>
  );
}
