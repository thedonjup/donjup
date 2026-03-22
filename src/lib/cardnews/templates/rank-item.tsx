import { colors } from "../colors";
import type { CardType, RankItem as RankItemData } from "../types";

interface RankItemProps {
  item: RankItemData;
  cardType: CardType;
}

function formatPrice(price: number): string {
  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const rest = price % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${price.toLocaleString()}만`;
}

export function RankItemCard({ item, cardType }: RankItemProps) {
  const isDrop = cardType === "drop";
  const accent = isDrop ? colors.accentDrop : colors.accentHigh;
  const rateText = isDrop
    ? `${item.change_rate.toFixed(1)}%`
    : `+${Math.abs(item.change_rate).toFixed(1)}%`;
  const priceLabel = isDrop ? "최고가" : "이전 최고가";

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
      {/* Rank Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "80px",
          height: "80px",
          borderRadius: "40px",
          backgroundColor: accent,
          fontSize: "40px",
          fontWeight: 800,
          color: colors.textWhite,
          marginBottom: "40px",
        }}
      >
        {item.rank}
      </div>

      {/* Apt Name */}
      <div
        style={{
          fontSize: "48px",
          fontWeight: 800,
          color: colors.textWhite,
          textAlign: "center",
          marginBottom: "12px",
        }}
      >
        {item.apt_name}
      </div>

      {/* Region */}
      <div
        style={{
          fontSize: "24px",
          color: colors.textMuted,
          marginBottom: "48px",
        }}
      >
        {item.region_name}
        {item.size_sqm ? ` · ${item.size_sqm}㎡` : ""}
      </div>

      {/* Price comparison */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontSize: "22px",
            color: colors.textMuted,
          }}
        >
          {priceLabel}: {formatPrice(item.highest_price)}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              color: colors.textMuted,
            }}
          >
            →
          </div>
        </div>

        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: colors.textWhite,
          }}
        >
          현재가: {formatPrice(item.trade_price)}
        </div>
      </div>

      {/* Change Rate */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 32px",
          borderRadius: "12px",
          backgroundColor: colors.badgeBg,
        }}
      >
        <div
          style={{
            fontSize: "40px",
            fontWeight: 800,
            color: accent,
          }}
        >
          {rateText}
        </div>
      </div>
    </div>
  );
}
