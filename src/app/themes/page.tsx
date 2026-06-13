import Link from "next/link";
import type { Metadata } from "next";
import { formatPrice, formatRegion } from "@/lib/format";
import { aptUrl } from "@/lib/apt-url";
import AdSlot from "@/components/ads/AdSlot";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  getCachedThemeResults,
  getThemeDefinition,
  getThemeList,
  type ThemeDefinition,
  type ThemeResult,
} from "@/lib/theme-query";

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

const THEMES = getThemeList();

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { theme: themeParam } = await searchParams;
  const selectedTheme = typeof themeParam === "string" ? themeParam : null;

  let results: ThemeResult[] = [];
  let activeTheme: ThemeDefinition | null = null;

  if (selectedTheme) {
    activeTheme = getThemeDefinition(selectedTheme);

    if (activeTheme) {
      try {
        results = await getCachedThemeResults(activeTheme.id, 30);
      } catch (e) {
        logDatabaseFailure("Themes query failed", e, {
          route: "/themes",
          theme: selectedTheme,
        });
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
