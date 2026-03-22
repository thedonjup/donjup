import { colors } from "../colors";

export function Cta() {
  return (
    <div
      style={{
        width: "1080px",
        height: "1080px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bgDark,
        padding: "80px",
      }}
    >
      <div
        style={{
          fontSize: "44px",
          fontWeight: 800,
          color: colors.textWhite,
          textAlign: "center",
          lineHeight: 1.4,
          marginBottom: "32px",
        }}
      >
        더 많은 부동산 데이터가{"\n"}궁금하다면?
      </div>

      <div
        style={{
          width: "120px",
          height: "4px",
          backgroundColor: colors.accentDrop,
          marginBottom: "40px",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 48px",
          borderRadius: "16px",
          backgroundColor: colors.accentDrop,
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: colors.textWhite,
          }}
        >
          donjup.com
        </div>
      </div>

      <div
        style={{
          fontSize: "22px",
          color: colors.textMuted,
          marginBottom: "48px",
        }}
      >
        폭락 · 신고가 · 금리 · 거래량 한눈에
      </div>

      <div
        style={{
          fontSize: "20px",
          color: colors.textSecondary,
        }}
      >
        @donjupkr
      </div>
    </div>
  );
}
