import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLUSTER_DEFINITIONS } from "@/lib/constants/region-codes";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import { computeClusterIndex } from "@/lib/cluster-index";
import { getPool } from "@/lib/db/client";
import { computeMedianPrice } from "@/lib/price-normalization";
import ClusterIndexChart from "@/components/charts/ClusterIndexChart";
import { formatPrice } from "@/lib/format";

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

function getSigunguName(code: string): string {
  for (const sido of Object.values(REGION_HIERARCHY)) {
    if (sido.sigungu[code]) return sido.sigungu[code];
  }
  return code;
}

async function getPerRegionMedian(
  regionCodes: string[]
): Promise<{ regionCode: string; name: string; medianPrice: number; count: number }[]> {
  if (regionCodes.length === 0) return [];

  const placeholders = regionCodes.map((_, i) => `$${i + 2}`).join(", ");
  const sql = `
    SELECT region_code, trade_price
    FROM apt_transactions
    WHERE trade_date >= $1
      AND region_code IN (${placeholders})
      AND property_type = 1
      AND deal_type != '직거래'
    ORDER BY trade_date DESC
  `;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const dateStr = threeMonthsAgo.toISOString().slice(0, 10);

  const pool = getPool();
  const result = await pool.query(sql, [dateStr, ...regionCodes]);

  type Row = { region_code: string; trade_price: number | string };
  const rows = result.rows as Row[];

  const byCode = new Map<string, number[]>();
  for (const r of rows) {
    const code = r.region_code;
    const price = Number(r.trade_price);
    const existing = byCode.get(code);
    if (existing) {
      existing.push(price);
    } else {
      byCode.set(code, [price]);
    }
  }

  return regionCodes.map((code) => {
    const prices = byCode.get(code) ?? [];
    return {
      regionCode: code,
      name: getSigunguName(code),
      medianPrice: computeMedianPrice(prices),
      count: prices.length,
    };
  });
}

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = await params;
  const cluster = CLUSTER_DEFINITIONS.find((c) => c.id === clusterId);
  if (!cluster) notFound();

  let indexPoints: Awaited<ReturnType<typeof computeClusterIndex>> = [];
  let perRegion: Awaited<ReturnType<typeof getPerRegionMedian>> = [];

  try {
    [indexPoints, perRegion] = await Promise.all([
      computeClusterIndex(cluster.regionCodes),
      getPerRegionMedian(cluster.regionCodes),
    ]);
  } catch {
    // graceful degradation
  }

  const chartData = indexPoints.map((p) => ({
    month: p.month,
    index: p.index,
    count: p.count,
  }));

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
        최초 데이터 월 = 100 기준 중위가 지수
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
            <p
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              {r.count > 0 ? formatPrice(Math.round(r.medianPrice / 10000) * 10000) : "데이터 없음"}
            </p>
            {r.count > 0 && (
              <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                {r.count}건 기준
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
