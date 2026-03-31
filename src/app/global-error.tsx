"use client";

// design-system-exception: global-error renders outside ThemeProvider and layout.tsx
// Hardcoded colors are intentional — CSS variables may not be available in error state

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#ffffff",
          color: "#1a1a2e",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "0 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              height: 64,
              width: 64,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "#2563eb",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            ₩
          </div>
          <h1
            style={{
              marginTop: 24,
              fontSize: 22,
              fontWeight: 800,
              color: "#1a1a2e",
            }}
          >
            일시적인 오류가 발생했습니다
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#6b7280" }}>
            잠시 후 다시 시도해 주세요.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                borderRadius: 12,
                background: "#2563eb",
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
            <a
              href="/"
              style={{
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 700,
                color: "#1a1a2e",
                textDecoration: "none",
              }}
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
