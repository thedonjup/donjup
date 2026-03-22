import { colors } from "../colors";
import type { CardType } from "../types";

interface CoverProps {
  date: string;
  cardType: CardType;
}

export function Cover({ date, cardType }: CoverProps) {
  const isDrop = cardType === "drop";
  const accent = isDrop ? colors.accentDrop : colors.accentHigh;
  const title = isDrop ? "오늘의 폭락 아파트 TOP 3" : "오늘의 신고가 아파트 TOP 3";
  const subtitle = isDrop ? "최고가 대비 하락률 기준" : "역대 최고 거래가 갱신";

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
          display: "flex",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontSize: "28px",
            color: colors.textWhite,
            fontWeight: 700,
            letterSpacing: "-0.5px",
          }}
        >
          돈줍 DonJup
        </div>
      </div>

      <div
        style={{
          fontSize: "56px",
          fontWeight: 800,
          color: colors.textWhite,
          textAlign: "center",
          lineHeight: 1.3,
          marginBottom: "24px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          width: "120px",
          height: "4px",
          backgroundColor: accent,
          marginBottom: "32px",
        }}
      />

      <div
        style={{
          fontSize: "24px",
          color: colors.textMuted,
          marginBottom: "16px",
        }}
      >
        {subtitle}
      </div>

      <div
        style={{
          fontSize: "22px",
          color: colors.textSecondary,
        }}
      >
        {date}
      </div>
    </div>
  );
}
