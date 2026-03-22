import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import { formatPrice } from "@/lib/format";

export const revalidate = 3600; // ISR: 1시간

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
  const { slug } = await params;
  const supabase = await createClient();

  const { data: complex } = await supabase
    .from("apt_complexes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!complex) {
    notFound();
  }

  // 전체 거래 이력
  const { data: transactions } = await supabase
    .from("apt_transactions")
    .select("*")
    .eq("apt_name", complex.apt_name)
    .eq("region_code", complex.region_code)
    .order("trade_date", { ascending: false })
    .limit(100);

  const txns = (transactions ?? []) as Transaction[];

  // 통계 계산
  const prices = txns.map((t) => t.trade_price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const latestPrice = prices[0] ?? 0;
  const latestTxn = txns[0];

  // 면적별 그룹
  const sizeGroups = new Map<number, Transaction[]>();
  for (const t of txns) {
    const group = sizeGroups.get(t.size_sqm) ?? [];
    group.push(t);
    sizeGroups.set(t.size_sqm, group);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <div className="mb-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-600">
          홈
        </Link>
        {" > "}
        <span>{complex.region_name}</span>
        {complex.dong_name && (
          <>
            {" > "}
            <span>{complex.dong_name}</span>
          </>
        )}
      </div>

      {/* 단지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{complex.apt_name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {complex.region_name} {complex.dong_name ?? ""}
          {complex.built_year ? ` | ${complex.built_year}년 준공` : ""}
          {complex.total_units ? ` | ${complex.total_units}세대` : ""}
        </p>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <StatCard label="최근 거래가" value={formatPrice(latestPrice)} />
        <StatCard label="역대 최고가" value={formatPrice(maxPrice)} />
        <StatCard label="역대 최저가" value={formatPrice(minPrice)} />
        <StatCard
          label="최고가 대비"
          value={
            maxPrice > 0 && latestPrice > 0
              ? `${(((latestPrice - maxPrice) / maxPrice) * 100).toFixed(1)}%`
              : "-"
          }
          valueColor={
            latestPrice < maxPrice
              ? "text-red-600"
              : latestPrice > maxPrice
                ? "text-green-600"
                : undefined
          }
        />
      </div>

      <AdSlot slotId="apt-detail-infeed" format="infeed" />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* 좌측: 거래 이력 테이블 */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">거래 이력</h2>
          {txns.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-4 py-3">거래일</th>
                    <th className="px-4 py-3">면적</th>
                    <th className="px-4 py-3">층</th>
                    <th className="px-4 py-3 text-right">거래가</th>
                    <th className="px-4 py-3 text-right">변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{t.trade_date}</td>
                      <td className="px-4 py-3">{t.size_sqm}㎡</td>
                      <td className="px-4 py-3">{t.floor}층</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatPrice(t.trade_price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.change_rate !== null ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                              t.change_rate < 0
                                ? "bg-red-50 text-red-600"
                                : t.change_rate > 0
                                  ? "bg-green-50 text-green-600"
                                  : "bg-gray-50 text-gray-500"
                            }`}
                          >
                            {t.change_rate < 0 ? "▼" : t.change_rate > 0 ? "▲" : ""}
                            {" "}{Math.abs(t.change_rate)}%
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                        {t.is_new_high && (
                          <span className="ml-1 text-xs text-green-500 font-bold">
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
            <p className="text-sm text-gray-400">거래 이력이 없습니다.</p>
          )}
        </div>

        {/* 우측 사이드바 */}
        <aside className="space-y-6">
          {/* 면적별 최근 거래 */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-bold">면적별 시세</h2>
            <div className="space-y-3">
              {Array.from(sizeGroups.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([size, group]) => {
                  const latest = group[0];
                  const highest = Math.max(...group.map((g) => g.trade_price));
                  return (
                    <div key={size} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{size}㎡</p>
                        <p className="text-xs text-gray-400">
                          최고 {formatPrice(highest)}
                        </p>
                      </div>
                      <p className="font-bold">{formatPrice(latest.trade_price)}</p>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* CTA */}
          <Link
            href="/rate/calculator"
            className="block rounded-xl border-2 border-blue-100 bg-blue-50 p-5 text-center transition hover:border-blue-200"
          >
            <p className="font-bold text-blue-900">대출 이자 계산기</p>
            <p className="mt-1 text-sm text-blue-600">
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
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor ?? ""}`}>{value}</p>
    </div>
  );
}

