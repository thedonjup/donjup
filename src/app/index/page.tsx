import type { Metadata } from "next";
import Link from "next/link";
import { CLUSTER_DEFINITIONS } from "@/lib/constants/region-codes";
import { computeClusterIndex } from "@/lib/cluster-index";
import MiniAreaChartWrapper from "@/components/charts/MiniAreaChartWrapper";
import { formatPrice } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "지역 지수 대시보드 - 군집별 아파트 가격 지수",
  description:
    "강남3구, 마용성, 노도강, 수도권 주요 지역의 아파트 가격 지수를 한눈에 비교하세요. 중위가 기반 군집별 가격 추이 대시보드.",
  alternates: { canonical: "/index" },
};

const CLUSTER_COLORS = ["#2B579A", "#059669", "#DC2626", "#D97706"];

export default async function RegionalIndexPage() {
  const clusterData = await Promise.all(
    CLUSTER_DEFINITIONS.map(async (cluster, i) => {
      let indexPoints: Awaited<ReturnType<typeof computeClusterIndex>> = [];
      try {
        indexPoints = await computeClusterIndex(cluster.regionCodes);
      } catch {
        // Return empty on error — graceful degradation
      }

      const latest = indexPoints[indexPoints.length - 1];
      const prev = indexPoints[indexPoints.length - 2];
      const currentIndex = latest?.index ?? null;
      const change =
        currentIndex !== null && prev?.index !== undefined
          ? Math.round((currentIndex - prev.index) * 10) / 10
          : null;

      const sparklineData = indexPoints.slice(-24).map((p) => ({ value: p.index }));
      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];

      return { cluster, indexPoints, currentIndex, change, sparklineData, color };
    })
  );

  return (
    <main style={{ maxWidth: "1152px", margin: "0 auto", padding: "24px 16px" }}>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          marginBottom: "8px",
        }}
      >
        지역 지수 대시보드
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "24px",
        }}
      >
        군집별 아파트 중위가 지수 (최초 데이터 월 = 100)
      </p>

      <div
        style={{
          display: "grid",
          gap: "12px",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}
      >
        {clusterData.map(({ cluster, indexPoints, currentIndex, change, sparklineData, color }) => (
          <Link
            key={cluster.id}
            href={`/index/${cluster.id}`}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                background: "var(--color-surface-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "16px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    {cluster.name}
                  </p>
                  {indexPoints.length === 0 ? (
                    <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                      데이터 없음
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: "28px",
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                        lineHeight: 1,
                      }}
                    >
                      {currentIndex?.toFixed(1) ?? "-"}
                    </p>
                  )}
                </div>
                {change !== null && (
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: change >= 0 ? "#059669" : "#DC2626",
                      background: change >= 0 ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.08)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}
                  </span>
                )}
              </div>

              {indexPoints.length > 0 && (
                <>
                  <MiniAreaChartWrapper
                    data={sparklineData}
                    color={color}
                    height={48}
                    label={`${cluster.name} 지수 추이`}
                  />
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--color-text-secondary)",
                      marginTop: "8px",
                    }}
                  >
                    최근 중위가:{" "}
                    {formatPrice(
                      Math.round((indexPoints[indexPoints.length - 1]?.medianPrice ?? 0) / 10000) *
                        10000
                    )}
                  </p>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
