import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "돈줍 - 전월세 실거래가";
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
            background: "#7c3aed",
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
          전국 아파트 전월세
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 24,
            color: "#94a3b8",
          }}
        >
          고가 전세 TOP · 최근 월세 · 지역별 전세가율
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#64748b",
          }}
        >
          donjup.com/rent
        </div>
      </div>
    ),
    { ...size },
  );
}
