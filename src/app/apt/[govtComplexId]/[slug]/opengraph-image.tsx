import { ImageResponse } from "next/og";
import { formatPrice } from "@/lib/format";
import {
  getCachedAptDetailComplexBySlug,
  getCachedAptDetailSaleTransactions,
} from "@/lib/apt-detail-query";

export const runtime = "nodejs";
export const alt = "돈줍 아파트 실거래가";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ govtComplexId: string; slug: string }>;
}) {
  const { govtComplexId: region, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const complex = await getCachedAptDetailComplexBySlug(region, decodedSlug);
  const latest = complex
    ? (await getCachedAptDetailSaleTransactions(
      complex.id,
      complex.aptName,
      complex.regionCode,
      complex.propertyType,
    ))[0] ?? null
    : null;

  const aptName = complex?.aptName ?? "아파트";
  const regionName = complex?.regionName ?? "";
  const price = latest?.trade_price ? formatPrice(latest.trade_price) : "-";
  const rate = latest?.change_rate ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            DJ
          </div>
          <span style={{ color: "#64748b", fontSize: 20 }}>돈줍</span>
        </div>

        <div style={{ fontSize: 20, color: "#94a3b8" }}>{regionName}</div>
        <div
          style={{
            marginTop: 8,
            fontSize: 48,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-1px",
          }}
        >
          {aptName}
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "12px 28px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.1)",
              color: "#e2e8f0",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {price}
          </div>
          {rate !== null && rate !== undefined && (
            <div
              style={{
                padding: "12px 28px",
                borderRadius: 16,
                background: rate < 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                color: rate < 0 ? "#f87171" : "#34d399",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {rate < 0 ? "▼" : "▲"} {Math.abs(rate)}%
            </div>
          )}
        </div>

        <div style={{ position: "absolute", bottom: 32, fontSize: 18, color: "#64748b" }}>
          donjup.com
        </div>
      </div>
    ),
    { ...size }
  );
}
