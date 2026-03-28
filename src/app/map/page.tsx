import type { Metadata } from "next";
import { db } from "@/lib/db";
import { aptTransactions, aptComplexes } from "@/lib/db/schema";
import { desc, isNotNull, eq } from "drizzle-orm";
import KakaoMap from "@/components/map/KakaoMap";
import type { MapTransaction } from "@/components/map/KakaoMap";

export const metadata: Metadata = {
  title: "지도로 보는 실거래가",
  description:
    "전국 아파트 실거래가를 지도에서 확인하세요. 폭락, 하락, 신고가 단지를 한눈에 파악할 수 있습니다.",
  alternates: { canonical: "/map" },
  openGraph: {
    title: "돈줍 - 지도로 보는 실거래가",
    description: "전국 아파트 실거래가를 지도에서 확인하세요.",
  },
};

export default async function MapPage() {
  // Fetch recent transactions that have geocoded complexes
  const rows = await db
    .select({
      id: aptTransactions.id,
      apt_name: aptTransactions.aptName,
      region_name: aptTransactions.regionName,
      trade_price: aptTransactions.tradePrice,
      change_rate: aptTransactions.changeRate,
      is_new_high: aptTransactions.isNewHigh,
      size_sqm: aptTransactions.sizeSqm,
      trade_date: aptTransactions.tradeDate,
      complex_slug: aptComplexes.slug,
      dong_name: aptComplexes.dongName,
      latitude: aptComplexes.latitude,
      longitude: aptComplexes.longitude,
    })
    .from(aptTransactions)
    .innerJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
    .where(isNotNull(aptComplexes.latitude))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(500)
    .catch(() => []);

  const mapTransactions: MapTransaction[] = rows
    .filter((t) => t.latitude !== null && t.longitude !== null)
    .map((t) => ({
      id: t.id,
      apt_name: t.apt_name,
      region_name: t.region_name,
      dong_name: t.dong_name ?? null,
      trade_price: Number(t.trade_price),
      change_rate: t.change_rate !== null ? Number(t.change_rate) : null,
      is_new_high: t.is_new_high,
      slug: t.complex_slug ?? "",
      latitude: Number(t.latitude),
      longitude: Number(t.longitude),
      size_sqm: Number(t.size_sqm),
      trade_date: t.trade_date,
    }));

  // 거래 데이터 요약 (SSR용)
  const totalCount = mapTransactions.length;
  const newHighCount = mapTransactions.filter(t => t.is_new_high).length;
  const dropCount = mapTransactions.filter(t => t.change_rate !== null && t.change_rate <= -10).length;

  // 지역별 거래 수 상위 5개
  const regionCounts: Record<string, number> = {};
  for (const t of mapTransactions) {
    regionCounts[t.region_name] = (regionCounts[t.region_name] || 0) + 1;
  }
  const topRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      <KakaoMap transactions={mapTransactions} />
      {/* 크롤러용 SSR 텍스트 - 시각적으로 숨김 처리 */}
      <section className="sr-only" aria-label="지도 거래 요약">
        <h1>전국 아파트 실거래가 지도</h1>
        <p>
          최근 거래 {totalCount}건을 지도에서 확인하세요.
          신고가 {newHighCount}건, 10% 이상 하락 {dropCount}건이 포함되어 있습니다.
        </p>
        {topRegions.length > 0 && (
          <>
            <h2>주요 거래 지역</h2>
            <ul>
              {topRegions.map(([region, count]) => (
                <li key={region}>{region}: {count}건</li>
              ))}
            </ul>
          </>
        )}
        <p>
          지도에서 마커를 클릭하면 아파트별 상세 실거래 정보를 확인할 수 있습니다.
          폭락(빨간색), 하락(주황색), 신고가(초록색) 마커로 구분됩니다.
        </p>
      </section>
    </>
  );
}
