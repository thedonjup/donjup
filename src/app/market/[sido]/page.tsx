import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REGION_HIERARCHY, getSidoBySlug } from "@/lib/constants/region-codes";
import { formatPrice } from "@/lib/format";

export const revalidate = 3600;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
}

export async function generateStaticParams() {
  return Object.values(REGION_HIERARCHY).map((sido) => ({
    sido: sido.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sido: string }>;
}): Promise<Metadata> {
  const { sido: sidoSlug } = await params;
  const sido = getSidoBySlug(sidoSlug);
  if (!sido) return { title: "지역 정보" };

  return {
    title: `${sido.name} 시군구별 아파트 시세 - ${getCurrentMonth()}`,
    description: `${sido.name} 시군구별 아파트 실거래가 현황. 폭락 순위, 신고가, 거래량을 한눈에 비교하세요.`,
    keywords: [
      `${sido.name} 아파트 시세`,
      `${sido.shortName} 부동산`,
      "아파트 폭락",
      "시군구별 시세",
    ],
  };
}

export default async function MarketSidoPage({
  params,
}: {
  params: Promise<{ sido: string }>;
}) {
  const { sido: sidoSlug } = await params;
  const sido = getSidoBySlug(sidoSlug);
  if (!sido) notFound();

  const supabase = await createClient();
  const sigunguEntries = Object.entries(sido.sigungu);

  const sigunguStats = await Promise.all(
    sigunguEntries.map(async ([code, name]) => {
      const [countResult, dropResult, highResult] = await Promise.all([
        supabase
          .from("apt_transactions")
          .select("id", { count: "exact", head: true })
          .eq("region_code", code),
        supabase
          .from("apt_transactions")
          .select("apt_name,change_rate,trade_price")
          .eq("region_code", code)
          .not("change_rate", "is", null)
          .lt("change_rate", 0)
          .order("change_rate", { ascending: true })
          .limit(1),
        supabase
          .from("apt_transactions")
          .select("apt_name,trade_price")
          .eq("region_code", code)
          .eq("is_new_high", true)
          .order("trade_date", { ascending: false })
          .limit(1),
      ]);

      return {
        code,
        name,
        count: countResult.count ?? 0,
        topDrop: dropResult.data?.[0] ?? null,
        topHigh: highResult.data?.[0] ?? null,
      };
    })
  );

  const sorted = [...sigunguStats].sort((a, b) => b.count - a.count);
  const totalCount = sigunguStats.reduce((a, b) => a + b.count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-2 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        <Link href="/" className="hover:opacity-80">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/market" className="hover:opacity-80">지역별 시세</Link>
        <span className="mx-2">/</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{sido.name}</span>
      </div>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
            {sido.name} 시군구별 아파트 시세
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          총 {totalCount.toLocaleString()}건 · {getCurrentMonth()} 기준
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((region, i) => (
          <Link
            key={region.code}
            href={`/market/${sidoSlug}/${region.code}`}
            className="card-hover block rounded-2xl border border-surface-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rank-badge rank-badge-gold text-[11px]">{i + 1}</span>
                <h2 className="text-base font-bold text-dark-900">{region.name}</h2>
              </div>
              <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-600">
                {region.count.toLocaleString()}건
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {region.topDrop ? (
                <div className="rounded-lg bg-drop-bg px-3 py-2">
                  <p className="text-[10px] font-medium text-gray-500">최대 하락</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-dark-900">
                    {region.topDrop.apt_name}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-drop">
                    ▼ {Math.abs(region.topDrop.change_rate)}%
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-surface-50 px-3 py-2">
                  <p className="text-[10px] text-gray-400">하락 거래 없음</p>
                </div>
              )}

              {region.topHigh ? (
                <div className="rounded-lg bg-rise-bg px-3 py-2">
                  <p className="text-[10px] font-medium text-gray-500">신고가</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-dark-900">
                    {region.topHigh.apt_name}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-rise">
                    {formatPrice(region.topHigh.trade_price)}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-surface-50 px-3 py-2">
                  <p className="text-[10px] text-gray-400">신고가 없음</p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
