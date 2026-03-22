import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "돈줍 - 부동산 실거래가 폭락/신고가 랭킹";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "#059669",
            color: "white",
            fontSize: 36,
            fontWeight: 900,
          }}
        >
          ₩
        </div>

        {/* Title */}
        <div
          style={{
            marginTop: 24,
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-1px",
          }}
        >
          돈줍 DonJup
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 12,
            fontSize: 24,
            color: "#94a3b8",
          }}
        >
          부동산 실거래가 폭락/신고가 랭킹
        </div>

        {/* Tags */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 12,
          }}
        >
          {["📉 폭락 TOP", "📈 신고가", "💰 금리", "🏠 계산기"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "8px 20px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.1)",
                color: "#e2e8f0",
                fontSize: 18,
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#64748b",
          }}
        >
          donjup.com
        </div>
      </div>
    ),
    { ...size }
  );
}
