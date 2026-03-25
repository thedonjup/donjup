import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  // Fetch recent transactions that have geocoded complexes
  const { data: transactions } = await supabase
    .from("apt_transactions")
    .select(
      `
      id,
      apt_name,
      region_name,
      trade_price,
      change_rate,
      is_new_high,
      size_sqm,
      trade_date,
      complex_id,
      apt_complexes!inner (
        dong_name,
        slug,
        latitude,
        longitude
      )
    `,
    )
    .not("apt_complexes.latitude", "is", null)
    .not("apt_complexes.longitude", "is", null)
    .order("trade_date", { ascending: false })
    .limit(500);

  const mapTransactions: MapTransaction[] = (transactions ?? []).map((t: any) => ({
    id: t.id,
    apt_name: t.apt_name,
    region_name: t.region_name,
    dong_name: t.apt_complexes?.dong_name ?? null,
    trade_price: t.trade_price,
    change_rate: t.change_rate,
    is_new_high: t.is_new_high,
    slug: t.apt_complexes?.slug ?? "",
    latitude: t.apt_complexes?.latitude,
    longitude: t.apt_complexes?.longitude,
    size_sqm: t.size_sqm,
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
