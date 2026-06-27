import { ImageResponse } from "next/og";

export const APT_OG_IMAGE_SIZE = { width: 1200, height: 630 };

export type AptOgImageData = {
  aptName?: string | null;
  regionName?: string | null;
  price?: string | null;
  rate?: number | null;
};

export function safeAptOgText(
  value: string | null | undefined,
  fallback: string,
  maxLength: number,
): string {
  const text = (value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return fallback;
  return Array.from(text).slice(0, maxLength).join("");
}

function finiteRate(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rateText(value: number | null): string | null {
  if (value === null) return null;
  return `${value < 0 ? "▼" : "▲"} ${Math.abs(value).toFixed(1)}%`;
}

export function createAptOgImageResponse(data: AptOgImageData): ImageResponse {
  const aptName = safeAptOgText(data.aptName, "아파트", 34);
  const regionName = safeAptOgText(data.regionName, "돈줍 실거래가", 42);
  const price = safeAptOgText(data.price, "-", 24);
  const rate = finiteRate(data.rate);
  const rateLabel = rateText(rate);
  const isDrop = rate !== null && rate < 0;

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
          padding: 64,
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
          <span style={{ color: "#94a3b8", fontSize: 20 }}>돈줍</span>
        </div>

        <div style={{ fontSize: 20, color: "#94a3b8" }}>{regionName}</div>
        <div
          style={{
            marginTop: 8,
            fontSize: aptName.length > 18 ? 40 : 48,
            fontWeight: 800,
            color: "white",
            letterSpacing: 0,
            textAlign: "center",
            lineHeight: 1.15,
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
          {rateLabel && (
            <div
              style={{
                padding: "12px 28px",
                borderRadius: 16,
                background: isDrop ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                color: isDrop ? "#f87171" : "#34d399",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {rateLabel}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", bottom: 32, fontSize: 18, color: "#64748b" }}>
          donjup.com
        </div>
      </div>
    ),
    { ...APT_OG_IMAGE_SIZE },
  );
}

export function createFallbackAptOgImageResponse(): ImageResponse {
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
          background: "#0f172a",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 58, fontWeight: 900 }}>DonJup</div>
        <div style={{ marginTop: 18, fontSize: 28, color: "#94a3b8" }}>
          Apartment transaction data
        </div>
      </div>
    ),
    { ...APT_OG_IMAGE_SIZE },
  );
}
