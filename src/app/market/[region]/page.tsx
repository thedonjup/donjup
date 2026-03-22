import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SEOUL_REGION_CODES } from "@/lib/constants/region-codes";
import AdSlot from "@/components/ads/AdSlot";

export const revalidate = 3600;

function formatPrice(priceInManWon: number): string {
  if (priceInManWon >= 10000) {
    const eok = Math.floor(priceInManWon / 10000);
    const rest = priceInManWon % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${priceInManWon.toLocaleString()}만`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
}

export async function generateStaticParams() {
  return Object.keys(SEOUL_REGION_CODES).map((code) => ({
    region: code,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  const name = SEOUL_REGION_CODES[region];

  if (!name) {
    return { title: "지역 정보" };
  }

  const title = `${name} 아파트 폭락 순위 - ${getCurrentMonth()} | 돈줍`;
  return {
    title,
    description: `${name} 아파트 실거래가 폭락 순위, 신고가 갱신, 최근 거래 내역. 매일 자동 업데이트되는 ${name} 부동산 시세 정보.`,
    keywords: [
      `${name} 아파트`,
      `${name} 시세`,
      `${name} 폭락`,
      `${name} 실거래가`,
      "서울 아파트",
    ],
  };
}

interface Transaction {
  id: string;
  apt_name: string;
  size_sqm: number;
  floor: number;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  region_code: string;
  region_name: string;
}

export default async function MarketRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const regionName = SEOUL_REGION_CODES[region];

  if (!regionName) {
    notFound();
  }

  const supabase = await createClient();

  const [dropsResult, highsResult, recentResult, countResult] =
    await Promise.all([
      supabase
        .from("apt_transactions")
        .select("*")
        .eq("region_code", region)
        .eq("is_significant_drop", true)
        .order("change_rate", { ascending: true })
        .limit(10),
      supabase
        .from("apt_transactions")
        .select("*")
        .eq("region_code", region)
        .eq("is_new_high", true)
        .order("trade_date", { ascending: false })
        .limit(10),
      supabase
        .from("apt_transactions")
        .select("*")
        .eq("region_code", region)
        .order("trade_date", { ascending: false })
        .limit(20),
      supabase
        .from("apt_transactions")
        .select("id", { count: "exact", head: true })
        .eq("region_code", region),
    ]);

  const drops = (dropsResult.data ?? []) as Transaction[];
  const highs = (highsResult.data ?? []) as Transaction[];
  const recent = (recentResult.data ?? []) as Transaction[];
  const totalCount = countResult.count ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 지역 헤더 */}
      <section className="mb-8">
        <nav className="mb-4 text-sm text-gray-400">
          <Link href="/market" className="hover:text-gray-600">
            지역별 시세
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{regionName}</span>
        </nav>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {regionName} 아파트 실거래가 현황
        </h1>
        <p className="mt-2 text-gray-500">
          총 {totalCount.toLocaleString()}건의 거래 데이터 | {getCurrentMonth()}{" "}
          기준
        </p>
      </section>

      <AdSlot slotId="market-region-top" format="banner" />

      {/* 폭락 TOP 10 */}
      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <span className="inline-block h-6 w-1 rounded bg-red-500" />
          {regionName} 최고가 대비 폭락 TOP 10
        </h2>
        {drops.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-3 pr-4 font-medium">순위</th>
                  <th className="py-3 pr-4 font-medium">아파트</th>
                  <th className="py-3 pr-4 font-medium text-right">면적</th>
                  <th className="py-3 pr-4 font-medium text-right">최고가</th>
                  <th className="py-3 pr-4 font-medium text-right">거래가</th>
                  <th className="py-3 font-medium text-right">변동률</th>
                </tr>
              </thead>
              <tbody>
                {drops.map((t, i) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-4 font-bold text-red-500">
                      {i + 1}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{t.apt_name}</p>
                      <p className="text-xs text-gray-400">{t.trade_date}</p>
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-600">
                      {t.size_sqm}㎡
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-400 line-through">
                      {t.highest_price ? formatPrice(t.highest_price) : "-"}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      {formatPrice(t.trade_price)}
                    </td>
                    <td className="py-3 text-right font-bold text-red-600">
                      ▼ {t.change_rate !== null ? Math.abs(t.change_rate) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="해당 지역의 폭락 거래 데이터가 없습니다." />
        )}
      </section>

      {/* 신고가 TOP 10 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <span className="inline-block h-6 w-1 rounded bg-green-500" />
          {regionName} 신고가 갱신 TOP 10
        </h2>
        {highs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-3 pr-4 font-medium">순위</th>
                  <th className="py-3 pr-4 font-medium">아파트</th>
                  <th className="py-3 pr-4 font-medium text-right">면적</th>
                  <th className="py-3 pr-4 font-medium text-right">거래가</th>
                  <th className="py-3 font-medium text-right">거래일</th>
                </tr>
              </thead>
              <tbody>
                {highs.map((t, i) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-4 font-bold text-green-500">
                      {i + 1}
                    </td>
                    <td className="py-3 pr-4 font-semibold">{t.apt_name}</td>
                    <td className="py-3 pr-4 text-right text-gray-600">
                      {t.size_sqm}㎡
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      {formatPrice(t.trade_price)}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {t.trade_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="해당 지역의 신고가 거래 데이터가 없습니다." />
        )}
      </section>

      <AdSlot slotId="market-region-mid" format="banner" />

      {/* 최근 거래 내역 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <span className="inline-block h-6 w-1 rounded bg-gray-400" />
          {regionName} 최근 거래 내역
        </h2>
        {recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-3 pr-4 font-medium">아파트</th>
                  <th className="py-3 pr-4 font-medium text-right">면적</th>
                  <th className="py-3 pr-4 font-medium text-right">층</th>
                  <th className="py-3 pr-4 font-medium text-right">거래가</th>
                  <th className="py-3 font-medium text-right">거래일</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-4 font-semibold">{t.apt_name}</td>
                    <td className="py-3 pr-4 text-right text-gray-600">
                      {t.size_sqm}㎡
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-600">
                      {t.floor}층
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      {formatPrice(t.trade_price)}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {t.trade_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="해당 지역의 최근 거래 데이터가 없습니다." />
        )}
      </section>

      {/* CTA: 금리 계산기 */}
      <section className="mt-10">
        <Link
          href="/rate/calculator"
          className="block rounded-xl border-2 border-blue-100 bg-blue-50 p-6 text-center transition hover:border-blue-200 hover:bg-blue-100"
        >
          <p className="text-lg font-bold text-blue-900">
            {regionName} 아파트, 대출 이자는 얼마일까?
          </p>
          <p className="mt-1 text-sm text-blue-600">
            금리 계산기로 월 상환액을 확인하세요
          </p>
        </Link>
      </section>

      {/* 서울 25개 구 네비게이션 */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold">서울 다른 지역 보기</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SEOUL_REGION_CODES).map(([code, name]) => (
            <Link
              key={code}
              href={`/market/${code}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                code === region
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
      <p className="text-sm text-gray-400">{message}</p>
      <p className="mt-1 text-xs text-gray-300">
        데이터가 수집되면 자동으로 업데이트됩니다.
      </p>
    </div>
  );
}
