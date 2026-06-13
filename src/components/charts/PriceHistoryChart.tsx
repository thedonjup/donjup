"use client";

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import type { RatioPoint } from "@/components/apt/AptDetailClient";
import { formatPrice, formatPriceAxis } from "@/lib/format";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string;    // YYYY-MM
  average: number;  // monthly average price
  count: number;    // transaction count (0 = carried forward)
}

export interface DirectDealPoint {
  trade_date: string;
  trade_price: number;
  floor: number;
}

interface PriceHistoryChartProps {
  trendLine: MonthlyPoint[];
  rentTrendLine?: MonthlyPoint[];
  jeonseRatioLine?: RatioPoint[];
  directDeals?: DirectDealPoint[];
  showJeonseRatio?: boolean;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

// Convert YYYY-MM → "YY년 M월"
function formatMonthLabel(month: string): string {
  if (!month) return "";
  const parts = month.split("-");
  if (parts.length < 2) return month;
  const [y, m] = parts;
  return `${y.slice(2)}년 ${Number(m)}월`;
}

// Build chart data from monthly points
function toChartData(points: MonthlyPoint[]) {
  return points.map((p) => ({
    x: p.month,
    y: p.average,
    month: p.month,
    count: p.count,
    average: p.average,
  }));
}

// Map jeonse ratio points to chart-compatible format
function ratioLineData(ratioPoints: RatioPoint[]) {
  return ratioPoints.map((p) => ({
    x: p.month,
    y: p.ratio,
    month: p.month,
    isLowConfidence: p.isLowConfidence,
    ratio: p.ratio,
  }));
}

// Map direct deals to chart-compatible format
function directDealsData(deals: DirectDealPoint[]) {
  return deals.map((d) => ({
    x: d.trade_date.slice(0, 7), // Group by month for X-axis alignment
    y: d.trade_price,
    month: d.trade_date.slice(0, 7),
    fullDate: d.trade_date,
    price: d.trade_price,
    floor: d.floor,
    isDirectDeal: true,
  }));
}

// ────────────────────────────────────────────────────────────────
// Tooltip
// ────────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name?: string;
  dataKey?: string;
  stroke?: string;
  fill?: string;
  payload?: {
    x?: string;
    average?: number;
    count?: number;
    month?: string;
    ratio?: number;
    isLowConfidence?: boolean;
    isDirectDeal?: boolean;
    fullDate?: string;
    price?: number;
    floor?: number;
  };
  value?: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  if (!entry?.payload) return null;

  const data = entry.payload;

  // Direct deal tooltip (Scatter)
  if (data.isDirectDeal) {
    return (
      <div
        className="rounded-xl px-3 py-2 text-xs shadow-lg"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p style={{ color: "var(--color-text-tertiary)" }}>
          {data.fullDate} (직거래)
        </p>
        <p className="mt-0.5 font-bold" style={{ color: "var(--color-text-primary)" }}>
          직거래가: {formatPrice(data.price!)}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          {data.floor}층
        </p>
      </div>
    );
  }

  // Ratio tooltip
  if (data.ratio !== undefined) {
    const confidenceLabel = data.isLowConfidence ? " (낮은 신뢰도)" : "";
    return (
      <div
        className="rounded-xl px-3 py-2 text-xs shadow-lg"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p style={{ color: "var(--color-text-tertiary)" }}>
          {formatMonthLabel(data.month!)}{confidenceLabel}
        </p>
        <p className="mt-0.5 font-bold" style={{ color: "var(--color-chart-ratio)" }}>
          전세가율: {data.ratio.toFixed(1)}%
        </p>
      </div>
    );
  }

  // Monthly average tooltip
  if (data.month && data.average !== undefined) {
    const isRentLine = entry.stroke === "var(--color-chart-jeonse)";
    const countLabel = data.count! > 0 ? ` · ${data.count}건` : " · 거래 없음(이전값)";
    return (
      <div
        className="rounded-xl px-3 py-2 text-xs shadow-lg"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p style={{ color: "var(--color-text-tertiary)" }}>
          {formatMonthLabel(data.month)}{countLabel}
        </p>
        <p className="mt-0.5 font-bold" style={{ color: "var(--color-text-primary)" }}>
          {isRentLine ? "전세 월평균" : "매매 월평균"}: {formatPrice(data.average)}
        </p>
      </div>
    );
  }

  return null;
}

// ────────────────────────────────────────────────────────────────
// Main Chart
// ────────────────────────────────────────────────────────────────

export default function PriceHistoryChart({
  trendLine,
  rentTrendLine,
  jeonseRatioLine,
  directDeals = [],
  showJeonseRatio = false,
}: PriceHistoryChartProps) {
  if (trendLine.length < 2) return null;

  const hasRentTrend = (rentTrendLine?.length ?? 0) >= 2;
  const hasRatioOverlay = showJeonseRatio && (jeonseRatioLine?.length ?? 0) >= 2;
  const hasDirectDeals = directDeals.length > 0;

  // Compute Y domain
  const allPrices = [
    ...trendLine.map((d) => d.average),
    ...(rentTrendLine ?? []).map((d) => d.average),
    ...directDeals.map((d) => d.trade_price),
  ];

  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const pad = (maxP - minP) * 0.05;
  const yDomain: [number, number] = [
    Math.max(0, Math.floor((minP - pad) / 1000) * 1000),
    Math.ceil((maxP + pad) / 1000) * 1000,
  ];

  const saleData = toChartData(trendLine);
  const rentData = hasRentTrend ? toChartData(rentTrendLine!) : [];
  const ratioChartData = hasRatioOverlay ? ratioLineData(jeonseRatioLine!) : [];
  const scatterData = hasDirectDeals ? directDealsData(directDeals) : [];

  return (
    <div
      role="figure"
      aria-label="가격 추이 차트"
      className="rounded-2xl border p-5 t-card"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-card)",
      }}
    >
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-bold t-text">가격 추이</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: "var(--color-chart-sale)" }} />
            <span className="t-text-secondary">매매 추이</span>
          </span>
          {hasDirectDeals && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-text-tertiary)", opacity: 0.6 }} />
              <span className="t-text-secondary">직거래</span>
            </span>
          )}
          {hasRentTrend && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: "var(--color-chart-jeonse)" }} />
              <span className="t-text-secondary">전세 추이</span>
            </span>
          )}
          {hasRatioOverlay && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 border-t border-dashed" style={{ borderColor: "var(--color-chart-ratio)" }} />
                <span className="t-text-secondary">전세가율</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 border-t border-dotted opacity-50" style={{ borderColor: "var(--color-chart-ratio)" }} />
                <span className="t-text-tertiary text-[9px]">저신뢰구간</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="h-[280px] sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 5, right: hasRatioOverlay ? 45 : 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="x"
              type="category"
              allowDuplicatedCategory={false}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={formatMonthLabel}
            />
            <YAxis
              yAxisId={0}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatPriceAxis}
              width={60}
              domain={yDomain}
            />
            {showJeonseRatio && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
            )}
            <ZAxis type="number" range={[40, 40]} />
            <Tooltip content={<CustomTooltip />} />

            {/* Direct Deals (Scatter dots) */}
            {hasDirectDeals && (
              <Scatter
                yAxisId={0}
                data={scatterData}
                fill="var(--color-text-tertiary)"
                fillOpacity={0.4}
                stroke="none"
                isAnimationActive={false}
              />
            )}

            {/* Sale monthly average line */}
            <Line
              yAxisId={0}
              data={saleData}
              type="monotone"
              dataKey="y"
              stroke="var(--color-chart-sale)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "var(--color-chart-sale)", stroke: "#fff", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />

            {/* Rent monthly average line */}
            {hasRentTrend && (
              <Line
                yAxisId={0}
                data={rentData}
                type="monotone"
                dataKey="y"
                stroke="var(--color-chart-jeonse)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "var(--color-chart-jeonse)", stroke: "#fff", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {/* Jeonse ratio overlay (orange dashed, right Y-axis) */}
            {hasRatioOverlay && (
              <Line
                data={ratioChartData}
                yAxisId="right"
                type="monotone"
                dataKey="y"
                stroke="var(--color-chart-ratio)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
