import { formatPrice } from "@/lib/format";

export interface MapTransaction {
  id: string;
  apt_name: string;
  region_name: string;
  dong_name: string | null;
  trade_price: number;
  change_rate: number | null;
  is_new_high: boolean;
  slug: string;
  latitude: number;
  longitude: number;
  size_sqm: number | null;
  trade_date: string | null;
}

export function getMarkerColor(item: MapTransaction): string {
  if (item.change_rate !== null && item.change_rate <= -15) return "#dc2626";
  if (item.change_rate !== null && item.change_rate <= -10) return "#f97316";
  if (item.is_new_high) return "#10b981";
  return "#94a3b8";
}

export function getMarkerLabel(item: MapTransaction): string {
  if (item.change_rate !== null && item.change_rate <= -15) return "폭락";
  if (item.change_rate !== null && item.change_rate <= -10) return "하락";
  if (item.is_new_high) return "신고가";
  return "";
}

export function buildInfoWindowContent(item: MapTransaction): string {
  const color = getMarkerColor(item);
  const label = getMarkerLabel(item);
  const rateStr =
    item.change_rate !== null
      ? `${item.change_rate > 0 ? "+" : ""}${item.change_rate.toFixed(1)}%`
      : "-";
  const rateColor =
    item.change_rate !== null && item.change_rate < 0
      ? "var(--color-semantic-drop)"
      : item.is_new_high
        ? "var(--color-semantic-rise)"
        : "var(--color-text-secondary)";

  return `
    <div style="
      padding: 12px 16px; border-radius: 12px; min-width: 200px; max-width: 260px;
      background: var(--color-surface-card, #fff); border: 1px solid var(--color-border, #e2e8f0);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: inherit;
    ">
      <div style="font-weight: 700; font-size: 14px; color: var(--color-text-primary, #0f172a); margin-bottom: 4px;">
        ${item.apt_name}
        ${label ? `<span style="font-size: 11px; font-weight: 600; color: ${color}; margin-left: 4px;">${label}</span>` : ""}
      </div>
      <div style="font-size: 12px; color: var(--color-text-secondary, #475569); margin-bottom: 6px;">
        ${item.region_name} ${item.dong_name || ""}
      </div>
      <div style="font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; margin-bottom: 4px;">
        ${formatPrice(item.trade_price)}
        <span style="font-size: 12px; color: ${rateColor}; margin-left: 6px;">${rateStr}</span>
      </div>
      ${item.size_sqm ? `<div style="font-size: 11px; color: var(--color-text-tertiary, #94a3b8);">${item.size_sqm}㎡ ${item.trade_date ? `· ${item.trade_date}` : ""}</div>` : ""}
      <a href="/apt/${item.slug}" style="
        display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 600;
        color: #059669; text-decoration: none;
      ">상세보기 &rarr;</a>
    </div>
  `;
}
