import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "돈줍 - 지도로 보는 실거래가";
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
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
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
        <div
          style={{
            marginTop: 24,
            fontSize: 48,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-1px",
          }}
        >
          지도로 보는 실거래가
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 24,
            color: "#94a3b8",
          }}
        >
          폭락·하락·신고가 단지를 지도에서 한눈에
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#64748b",
          }}
        >
          donjup.com/map
        </div>
      </div>
    ),
    { ...size },
  );
}
