import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { SEOUL_REGION_CODES } from "@/lib/constants/region-codes";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "서울 25개 구별 아파트 시세 - 폭락 순위 & 신고가",
  description:
    "서울 25개 구별 아파트 실거래가 현황. 각 지역별 폭락 순위, 신고가, 거래량을 한눈에 비교하세요.",
  keywords: [
    "서울 아파트 시세",
    "구별 아파트 가격",
    "아파트 폭락",
    "서울 부동산",
  ],
};

export default async function MarketIndexPage() {
  const supabase = await createClient();

  const regionEntries = Object.entries(SEOUL_REGION_CODES);

  const regionStats = await Promise.all(
    regionEntries.map(async ([code, name]) => {
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

  // 거래량 기준 내림차순 정렬
  const sorted = [...regionStats].sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold text-dark-900 sm:text-3xl">
            서울 25개구 아파트 시세
          </h1>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          각 지역별 폭락 순위, 신고가, 최근 거래 현황을 한눈에 비교하세요.
        </p>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <span>총 {regionStats.reduce((a, b) => a + b.count, 0).toLocaleString()}건 수집</span>
          <span>·</span>
          <span>거래량순 정렬</span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((region, i) => (
          <Link
            key={region.code}
            href={`/market/${region.code}`}
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
              {/* 최대 폭락 */}
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

              {/* 최신 신고가 */}
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

function formatPrice(priceInManWon: number): string {
  if (priceInManWon >= 10000) {
    const eok = Math.floor(priceInManWon / 10000);
    const rest = priceInManWon % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${priceInManWon.toLocaleString()}만`;
}
