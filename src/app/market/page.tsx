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

  // 각 구별 최근 거래 건수 + 최대 폭락 아파트
  const regionEntries = Object.entries(SEOUL_REGION_CODES);

  const regionStats = await Promise.all(
    regionEntries.map(async ([code, name]) => {
      const [countResult, dropResult] = await Promise.all([
        supabase
          .from("apt_transactions")
          .select("id", { count: "exact", head: true })
          .eq("region_code", code),
        supabase
          .from("apt_transactions")
          .select("apt_name,change_rate,trade_price")
          .eq("region_code", code)
          .eq("is_significant_drop", true)
          .order("change_rate", { ascending: true })
          .limit(1),
      ]);

      return {
        code,
        name,
        count: countResult.count ?? 0,
        topDrop: dropResult.data?.[0] ?? null,
      };
    })
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          서울 25개 구별 아파트 시세
        </h1>
        <p className="mt-2 text-gray-500">
          각 지역별 폭락 순위, 신고가, 최근 거래 현황을 확인하세요.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {regionStats.map((region) => (
          <Link
            key={region.code}
            href={`/market/${region.code}`}
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-300"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{region.name}</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {region.count.toLocaleString()}건
              </span>
            </div>
            {region.topDrop ? (
              <div className="mt-3 rounded-lg bg-red-50 p-3">
                <p className="text-xs text-gray-500">최대 폭락</p>
                <p className="mt-1 text-sm font-semibold truncate">
                  {region.topDrop.apt_name}
                </p>
                <p className="text-sm font-bold text-red-600">
                  ▼ {Math.abs(region.topDrop.change_rate)}%
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-400">
                  폭락 거래 데이터 수집 중...
                </p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
