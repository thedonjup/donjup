import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLUSTER_DEFINITIONS } from "@/lib/constants/region-codes";
import {
  getCachedClusterIndex,
  getCachedClusterPerRegionMedian,
} from "@/lib/cluster-index";
import ClusterIndexChart from "@/components/charts/ClusterIndexChart";

export const revalidate = 3600;

export function generateStaticParams() {
  return CLUSTER_DEFINITIONS.map((c) => ({ clusterId: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}): Promise<Metadata> {
  const { clusterId } = await params;
  const cluster = CLUSTER_DEFINITIONS.find((c) => c.id === clusterId);
  if (!cluster) return {};
  return {
    title: `${cluster.name} 지수 - 아파트 가격 시계열`,
    description: `${cluster.name} 아파트 가격 지수 시계열. 중위가 기반 군집 지수로 장기 가격 흐름을 확인하세요.`,
    alternates: { canonical: `/index/${clusterId}` },
  };
}

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = await params;
  const cluster = CLUSTER_DEFINITIONS.find((c) => c.id === clusterId);
  if (!cluster) notFound();

  let indexPoints: Awaited<ReturnType<typeof getCachedClusterIndex>> = [];
  let perRegion: Awaited<ReturnType<typeof getCachedClusterPerRegionMedian>> = [];

  try {
    [indexPoints, perRegion] = await Promise.all([
      getCachedClusterIndex(cluster.regionCodes),
      getCachedClusterPerRegionMedian(cluster.regionCodes),
    ]);
  } catch {
    // graceful degradation
  }

  const chartData = indexPoints.map((p) => ({
    month: p.month,
    index: p.index,
    medianPrice: p.medianPrice,
    count: p.count,
  }));

  // 기준점 (지수 100)
  const basePoint = chartData.find((d) => d.index === 100) ?? chartData[0];
  const baseMonth = basePoint?.month ?? "";
  const basePrice = basePoint?.medianPrice ?? 0;

  function formatEok(price: number): string {
    const eok = price / 10000;
    return `${eok.toFixed(1)}억`;
  }
  function formatMonthLabel(month: string): string {
    const [y, m] = month.split("-");
    return `${y.slice(2)}년 ${Number(m)}월`;
  }

  return (
    <main style={{ maxWidth: "1152px", margin: "0 auto", padding: "24px 16px" }}>
      {/* Breadcrumb */}
      <nav
        style={{ marginBottom: "16px", fontSize: "13px", color: "var(--color-text-secondary)" }}
        aria-label="breadcrumb"
      >
        <Link
          href="/index"
          style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
        >
          지역 지수
        </Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>{cluster.name}</span>
      </nav>

      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          marginBottom: "4px",
        }}
      >
        {cluster.name} 지수
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "24px",
        }}
      >
        월별 중위 거래가 추이
      </p>

      {/* Full time series chart */}
      <div
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <ClusterIndexChart data={chartData} />
      </div>

      {/* Per-region stats */}
      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginBottom: "12px",
        }}
      >
        구별 최근 3개월 중위가
      </h2>
      <div
        style={{
          display: "grid",
          gap: "10px",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        }}
      >
        {perRegion.map((r) => (
          <div
            key={r.regionCode}
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                marginBottom: "6px",
              }}
            >
              {r.name}
            </p>
            {r.count > 0 ? (
              <>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {formatEok(r.medianPrice)}
                  {basePrice > 0 && (() => {
                    const diff = r.medianPrice - basePrice;
                    const sign = diff >= 0 ? "▲" : "▼";
                    const color = diff >= 0 ? "var(--color-semantic-rise)" : "var(--color-semantic-drop)";
                    return (
                      <span style={{ fontSize: "12px", fontWeight: 600, marginLeft: "6px", color }}>
                        {sign} {formatEok(Math.abs(diff))}
                      </span>
                    );
                  })()}
                </p>
                <p style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
                  {formatMonthLabel(baseMonth)} {formatEok(basePrice)} 기준 · {r.count}건
                </p>
              </>
            ) : (
              <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>데이터 없음</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
