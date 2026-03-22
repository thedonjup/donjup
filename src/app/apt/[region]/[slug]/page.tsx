import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import ShareButtons from "@/components/ShareButtons";
import { formatPrice } from "@/lib/format";
import PriceHistoryChart from "@/components/charts/PriceHistoryChartWrapper";

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
    description: `${complex.apt_name} 아파트 실거래가 시세, 최고가 대비 변동률, 거래 이력 확인`,
  };
}

export default async function AptDetailPage({
  params,
}: {
  params: Promise<{ region: string; slug: string }>;
}) {
  const { slug, region } = await params;
  const supabase = await createClient();

  const { data: complex } = await supabase
    .from("apt_complexes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!complex) {
    notFound();
  }

  const { data: transactions } = await supabase
    .from("apt_transactions")
    .select("*")
    .eq("apt_name", complex.apt_name)
    .eq("region_code", complex.region_code)
    .order("trade_date", { ascending: false })
    .limit(100);

  const txns = (transactions ?? []) as Transaction[];

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
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
          <ShareButtons
            url={`https://donjup.com/apt/${region}/${slug}`}
            title={`${complex.apt_name} 실거래가`}
            description={`${complex.apt_name} 최근 거래가 ${formatPrice(latestPrice)} | 돈줍`}
          />
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {complex.region_name} {complex.dong_name ?? ""}
          {complex.built_year ? ` · ${complex.built_year}년 준공` : ""}
          {complex.total_units ? ` · ${complex.total_units}세대` : ""}
        </p>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-3 sm:grid-cols-4 mb-8">
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
        {/* 좌측: 거래 이력 테이블 */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold t-text">거래 이력</h2>
          {txns.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border t-card" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" }}>
                    <th className="px-4 py-3">거래일</th>
                    <th className="px-4 py-3">면적</th>
                    <th className="px-4 py-3">층</th>
                    <th className="px-4 py-3 text-right">거래가</th>
                    <th className="px-4 py-3 text-right">변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <td className="px-4 py-3 t-text">{t.trade_date}</td>
                      <td className="px-4 py-3 t-text">{t.size_sqm}㎡</td>
                      <td className="px-4 py-3 t-text">{t.floor}층</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">
                        {formatPrice(t.trade_price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.change_rate !== null ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                              t.change_rate < 0
                                ? "t-drop-bg t-drop"
                                : t.change_rate > 0
                                  ? "t-rise-bg t-rise"
                                  : ""
                            }`}
                            style={
                              t.change_rate < 0
                                ? { background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }
                                : t.change_rate > 0
                                  ? { background: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" }
                                  : { color: "var(--color-text-tertiary)" }
                            }
                          >
                            {t.change_rate < 0 ? "▼" : t.change_rate > 0 ? "▲" : ""}
                            {" "}{Math.abs(t.change_rate)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-tertiary)" }}>-</span>
                        )}
                        {t.is_new_high && (
                          <span className="ml-1 text-xs font-bold" style={{ color: "var(--color-semantic-rise)" }}>
                            신고가
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>거래 이력이 없습니다.</p>
          )}
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
                      <span className="font-medium t-text">{size}㎡</span>
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

          {/* CTA */}
          <Link
            href="/rate/calculator"
            className="card-hover block rounded-2xl border-2 border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 text-center"
          >
            <p className="font-bold text-brand-900">대출 이자 계산기</p>
            <p className="mt-1 text-sm text-brand-600">
              {latestPrice > 0
                ? `${formatPrice(latestPrice)} 대출 시 이자는?`
                : "내 대출 이자 계산하기"}
            </p>
          </Link>

          <AdSlot slotId="apt-sidebar-rect" format="rectangle" className="hidden lg:block" />
        </aside>
      </div>
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
