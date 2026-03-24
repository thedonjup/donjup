import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "돈줍 아파트 실거래가";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatPrice(v: number): string {
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = v % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${v.toLocaleString()}만`;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = await createClient();

  let { data: complex } = await supabase
    .from("apt_complexes")
    .select("apt_name,region_name,dong_name,slug")
    .eq("slug", decodedSlug)
    .single();

  // Fallback lookup by region_code + apt slug part
  if (!complex) {
    const dashIdx = decodedSlug.indexOf("-");
    if (dashIdx > 0) {
      const regionCode = decodedSlug.substring(0, dashIdx);
      const aptSlugPart = decodedSlug.substring(dashIdx + 1);
      const { data: fallbackList } = await supabase
        .from("apt_complexes")
        .select("apt_name,region_name,dong_name,slug")
        .eq("region_code", regionCode)
        .limit(50);

      if (fallbackList && fallbackList.length > 0) {
        complex = fallbackList.find((c: Record<string, unknown>) => {
          const s = String(c.slug ?? "");
          const dbDash = s.indexOf("-");
          const dbSuffix = dbDash > 0 ? s.substring(dbDash + 1) : s;
          return dbSuffix === aptSlugPart || s === decodedSlug;
        }) ?? null;
      }
    }
  }

  const { data: latest } = await supabase
    .from("apt_transactions")
    .select("trade_price,change_rate")
    .eq("apt_name", complex?.apt_name ?? "")
    .order("trade_date", { ascending: false })
    .limit(1)
    .single();

  const aptName = complex?.apt_name ?? "아파트";
  const region = complex?.region_name ?? "";
  const price = latest?.trade_price ? formatPrice(latest.trade_price) : "-";
  const rate = latest?.change_rate;

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
