import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatPrice } from "@/lib/format";

export const runtime = "nodejs";
export const alt = "돈줍 아파트 실거래가";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  let complex: { apt_name: string; region_name: string; dong_name: string | null; slug: string } | null = null;

  const exactMatch = await db.select({
    apt_name: aptComplexes.aptName,
    region_name: aptComplexes.regionName,
    dong_name: aptComplexes.dongName,
    slug: aptComplexes.slug,
  }).from(aptComplexes).where(eq(aptComplexes.slug, decodedSlug)).limit(1);

  if (exactMatch[0]) {
    complex = exactMatch[0];
  }

  // Fallback lookup by region_code + apt slug part
  if (!complex) {
    const dashIdx = decodedSlug.indexOf("-");
    if (dashIdx > 0) {
      const regionCode = decodedSlug.substring(0, dashIdx);
      const aptSlugPart = decodedSlug.substring(dashIdx + 1);
      const fallbackList = await db.select({
        apt_name: aptComplexes.aptName,
        region_name: aptComplexes.regionName,
        dong_name: aptComplexes.dongName,
        slug: aptComplexes.slug,
      }).from(aptComplexes).where(eq(aptComplexes.regionCode, regionCode)).limit(50);

      if (fallbackList.length > 0) {
        const found = fallbackList.find((c) => {
          const s = c.slug ?? "";
          const dbDash = s.indexOf("-");
          const dbSuffix = dbDash > 0 ? s.substring(dbDash + 1) : s;
          return dbSuffix === aptSlugPart || s === decodedSlug;
        });
        if (found) complex = found;
      }
    }
  }

  const latestRows = await db.select({
    trade_price: aptTransactions.tradePrice,
    change_rate: aptTransactions.changeRate,
  }).from(aptTransactions)
    .where(eq(aptTransactions.aptName, complex?.apt_name ?? ""))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(1);

  const latest = latestRows[0] ?? null;

  const aptName = complex?.apt_name ?? "아파트";
  const region = complex?.region_name ?? "";
  const price = latest?.trade_price ? formatPrice(Number(latest.trade_price)) : "-";
  const rate = latest?.change_rate ? Number(latest.change_rate) : null;

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
            ₩
          </div>
          <span style={{ color: "#64748b", fontSize: 20 }}>돈줍</span>
        </div>

        <div style={{ fontSize: 20, color: "#94a3b8" }}>{region}</div>
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
