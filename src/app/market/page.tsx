import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import { formatPrice } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "전국 시도별 아파트 시세 - 폭락 순위 & 신고가",
  description:
    "전국 17개 시·도별 아파트 실거래가 현황. 각 지역별 폭락 순위, 신고가, 거래량을 한눈에 비교하세요.",
  keywords: [
    "전국 아파트 시세",
    "시도별 아파트 가격",
    "아파트 폭락",
    "전국 부동산",
  ],
};

export default async function MarketIndexPage() {
  const supabase = await createClient();

  const sidoEntries = Object.entries(REGION_HIERARCHY);

  let sidoStats: {
    code: string;
    name: string;
    shortName: string;
    slug: string;
    sigunguCount: number;
    count: number;
    topDrop: { apt_name: string; change_rate: number; trade_price: number } | null;
    topHigh: { apt_name: string; trade_price: number } | null;
  }[] = [];

  try {
    sidoStats = await Promise.all(
      sidoEntries.map(async ([sidoCode, sido]) => {
        const sigunguCodes = Object.keys(sido.sigungu);

        const [countResult, dropResult, highResult] = await Promise.all([
          supabase
            .from("apt_transactions")
            .select("id", { count: "exact", head: true })
            .in("region_code", sigunguCodes),
          supabase
            .from("apt_transactions")
            .select("apt_name,change_rate,trade_price")
            .in("region_code", sigunguCodes)
            .not("change_rate", "is", null)
            .lt("change_rate", 0)
            .order("change_rate", { ascending: true })
            .limit(1),
          supabase
            .from("apt_transactions")
            .select("apt_name,trade_price")
            .in("region_code", sigunguCodes)
            .eq("is_new_high", true)
            .order("trade_date", { ascending: false })
            .limit(1),
        ]);

        return {
          code: sidoCode,
          name: sido.name,
          shortName: sido.shortName,
          slug: sido.slug,
          sigunguCount: sigunguCodes.length,
          count: countResult.count ?? 0,
          topDrop: dropResult.data?.[0] ?? null,
          topHigh: highResult.data?.[0] ?? null,
        };
      })
    );
  } catch (error) {
    console.error("시도별 통계 조회 실패:", error);
  }

  const sorted = [...sidoStats].sort((a, b) => b.count - a.count);
  const totalCount = sidoStats.reduce((a, b) => a + b.count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold text-dark-900 sm:text-3xl">
            전국 시·도별 아파트 시세
          </h1>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          전국 17개 시·도별 폭락 순위, 신고가, 최근 거래 현황을 한눈에 비교하세요.
        </p>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <span>총 {totalCount.toLocaleString()}건 수집</span>
          <span>·</span>
          <span>거래량순 정렬</span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((sido, i) => (
          <Link
            key={sido.code}
            href={`/market/${sido.slug}`}
            className="card-hover block rounded-2xl border border-surface-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rank-badge rank-badge-gold text-[11px]">{i + 1}</span>
                <h2 className="text-base font-bold text-dark-900">{sido.name}</h2>
              </div>
              <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-600">
                {sido.count.toLocaleString()}건
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* 최대 폭락 */}
              {sido.topDrop ? (
                <div className="rounded-lg bg-drop-bg px-3 py-2">
                  <p className="text-[10px] font-medium text-gray-500">최대 하락</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-dark-900">
                    {sido.topDrop.apt_name}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-drop">
                    ▼ {Math.abs(sido.topDrop.change_rate)}%
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-surface-50 px-3 py-2">
                  <p className="text-[10px] text-gray-400">하락 거래 없음</p>
                </div>
              )}

              {/* 최신 신고가 */}
              {sido.topHigh ? (
                <div className="rounded-lg bg-rise-bg px-3 py-2">
                  <p className="text-[10px] font-medium text-gray-500">신고가</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-dark-900">
                    {sido.topHigh.apt_name}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-rise">
                    {formatPrice(sido.topHigh.trade_price)}
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
