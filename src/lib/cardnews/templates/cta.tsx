import { colors } from "../colors";

export type CtaVariant = "A" | "B" | "C" | "D";

const CTA_VARIANTS: Record<CtaVariant, { headline: string; cta: string; sub: string }> = {
  A: {
    headline: "이 동네 사는 친구한테\n보내줘",
    cta: "@donjupkr",
    sub: "친구 태그하고 같이 확인해봐",
  },
  B: {
    headline: "내가 보는 아파트는\n얼마나 빠졌을까?",
    cta: "donjup.com",
    sub: "폭락 · 신고가 · 금리 · 거래량 한눈에",
  },
  C: {
    headline: "저장해두면 나중에\n비교하기 좋아요",
    cta: "@donjupkr",
    sub: "매일 업데이트되는 실거래가 랭킹",
  },
  D: {
    headline: "주변에 영끌한 친구 있으면\n공유해줘",
    cta: "donjup.com",
    sub: "최고가 대비 하락률 실시간 추적",
  },
};

export function Cta({ variant = "B" }: { variant?: CtaVariant }) {
  const v = CTA_VARIANTS[variant];

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
        {v.headline}
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
          {v.cta}
        </div>
      </div>

      <div
        style={{
          fontSize: "22px",
          color: colors.textMuted,
          marginBottom: "48px",
        }}
      >
        {v.sub}
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
