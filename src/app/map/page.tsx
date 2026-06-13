import type { Metadata } from "next";
import KakaoMap from "@/components/map/KakaoMap";
import type { MapTransaction } from "@/components/map/KakaoMap";
import { parseCompareIds } from "@/lib/compare-selection";
import { logDatabaseFailure } from "@/lib/db/logging";
import { formatRegion } from "@/lib/format";
import { getCachedMapTransactions } from "@/lib/map-dashboard-query";

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

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { complex } = await searchParams;
  const initialComplexId = parseCompareIds(
    typeof complex === "string" ? complex : Array.isArray(complex) ? complex[0] : null,
  )[0];

  let mapTransactions: MapTransaction[] = [];
  let mapDataUnavailable = false;

  try {
    mapTransactions = await getCachedMapTransactions();
  } catch (error) {
    mapDataUnavailable = true;
    logDatabaseFailure("map transaction query failed", error, {
      route: "/map",
    });
  }

  // 거래 데이터 요약 (SSR용)
  const totalCount = mapTransactions.length;
  const newHighCount = mapTransactions.filter(t => t.is_new_high).length;
  const dropCount = mapTransactions.filter(t => t.change_rate !== null && t.change_rate <= -10).length;

  // 지역별 거래 수 상위 5개 (region_code 기반으로 집계 후 변환)
  const regionCounts: Record<string, number> = {};
  for (const t of mapTransactions) {
    regionCounts[t.region_code] = (regionCounts[t.region_code] || 0) + 1;
  }
  const topRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      <KakaoMap
        transactions={mapTransactions}
        initialComplexId={initialComplexId}
        dataUnavailable={mapDataUnavailable}
      />
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
              {topRegions.map(([code, count]) => (
                <li key={code}>{formatRegion(code)}: {count}건</li>
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
