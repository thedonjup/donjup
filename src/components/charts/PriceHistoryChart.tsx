"use client";

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Customized,
} from "recharts";
import type { RatioPoint } from "@/components/apt/AptDetailClient";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface ChartTransaction {
  trade_date: string;
  trade_price: number;
  size_sqm: number;
  deal_type: string | null;
  floor: number;
  isDirectDeal: boolean;
  prevPrice?: number; // for direct deals: previous same-size non-direct price
}

export interface TrendPoint {
  month: string;       // YYYY-MM
  median: number;      // 3-month moving median price
  count: number;       // transaction count in window
  isLowConfidence: boolean; // < 5 transactions → dashed line
}

interface PriceHistoryChartProps {
  normalDots: ChartTransaction[];
  directDealDots: ChartTransaction[];
  trendLine: TrendPoint[];
  rentTrendLine?: TrendPoint[];       // jeonse trend line
  jeonseRatioLine?: RatioPoint[];     // ratio overlay
  showJeonseRatio?: boolean;          // overlay toggle
  sizeUnit?: "sqm" | "pyeong";
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function formatPrice(v: number): string {
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = v % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${v.toLocaleString()}만`;
}

function sqmToPyeong(sqm: number): number {
  return Math.round(sqm / 3.3058);
}

function formatPriceAxis(v: number): string {
  if (v >= 10000) {
    return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억`;
  }
  return `${v.toLocaleString()}만`;
}

// Convert YYYY-MM-DD → MM-DD display
function formatDateLabel(dateStr: string): string {
  return dateStr.slice(5); // "MM-DD"
}

// ────────────────────────────────────────────────────────────────
// Direct Deal Connector — SVG overlay via <Customized>
// ────────────────────────────────────────────────────────────────

interface ConnectorProps {
  directDealDots: ChartTransaction[];
  xAxisMap?: Record<string, { scale: (v: string) => number }>;
  yAxisMap?: Record<string, { scale: (v: number) => number }>;
}

function DirectDealConnectors({ directDealDots, xAxisMap, yAxisMap }: ConnectorProps) {
  if (!xAxisMap || !yAxisMap) return null;

  const xScale = xAxisMap[0]?.scale;
  const yScale = yAxisMap[0]?.scale;
  if (!xScale || !yScale) return null;

  return (
    <>
      {directDealDots.map((dd, i) => {
        if (dd.prevPrice === undefined || dd.prevPrice === null) return null;

        const x = xScale(dd.trade_date);
        const y1 = yScale(dd.trade_price);
        const y2 = yScale(dd.prevPrice);

        if (isNaN(x) || isNaN(y1) || isNaN(y2)) return null;

        return (
          <g key={`connector-${i}`}>
            {/* Dashed vertical line from prevPrice to trade_price */}
            <line
              x1={x}
              y1={y1}
              x2={x}
              y2={y2}
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {/* Small gray dot at prevPrice position */}
            <circle
              cx={x}
              cy={y2}
              r={2}
              fill="#9CA3AF"
              opacity={0.6}
            />
          </g>
        );
      })}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Trend line rendering — split solid/dashed segments
// ────────────────────────────────────────────────────────────────

// Full trend line (solid for high-confidence months)
function solidTrendData(trendLine: TrendPoint[]) {
  return trendLine.map((p) => ({
    x: `${p.month}-15`, // mid-month as date string for x positioning
    y: p.isLowConfidence ? null : p.median,
    month: p.month,
    count: p.count,
    isLowConfidence: p.isLowConfidence,
    median: p.median,
  }));
}

// Low-confidence segments only (dashed overlay)
function dashedTrendData(trendLine: TrendPoint[]) {
  return trendLine.map((p) => ({
    x: `${p.month}-15`,
    y: p.isLowConfidence ? p.median : null,
    month: p.month,
    count: p.count,
    isLowConfidence: p.isLowConfidence,
    median: p.median,
  }));
}

// Map jeonse ratio points to chart-compatible format
function ratioLineData(ratioPoints: RatioPoint[]) {
  return ratioPoints.map((p) => ({
    x: `${p.month}-15`,
    y: p.ratio,
    month: p.month,
    isLowConfidence: p.isLowConfidence,
    ratio: p.ratio,
  }));
}

// ────────────────────────────────────────────────────────────────
// Tooltip
// ────────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name?: string;
  dataKey?: string;
  stroke?: string;
  payload?: {
    trade_date?: string;
    trade_price?: number;
    size_sqm?: number;
    floor?: number;
    deal_type?: string | null;
    isDirectDeal?: boolean;
    x?: string;
    median?: number;
    count?: number;
    isLowConfidence?: boolean;
    month?: string;
    ratio?: number;
  };
  value?: number;
}

function CustomTooltip({
  active,
  payload,
  sizeUnit = "sqm",
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  sizeUnit?: "sqm" | "pyeong";
}) {
  if (!active || !payload?.length) return null;

  // Find first payload that has actual data
  const entry = payload.find((p) => p.payload && (p.payload.trade_date || p.payload.month));
  if (!entry?.payload) return null;

  const data = entry.payload;

  // Transaction dot tooltip
  if (data.trade_date) {
    const sizeLabel =
      sizeUnit === "pyeong"
        ? `${sqmToPyeong(data.size_sqm ?? 0)}평`
        : `${data.size_sqm}㎡`;
    const dealLabel = data.isDirectDeal ? " · 직거래" : "";
    return (
      <div
        className="rounded-xl px-3 py-2 text-xs shadow-lg"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p style={{ color: "var(--color-text-tertiary)" }}>
          {data.trade_date} · {data.floor}층 · {sizeLabel}{dealLabel}
        </p>
        <p className="mt-0.5 font-bold" style={{ color: "var(--color-text-primary)" }}>
          {formatPrice(data.trade_price ?? 0)}
        </p>
      </div>
    );
  }

  // Ratio tooltip (orange line — entry stroke is #F97316)
  if (data.month && data.ratio !== undefined) {
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
          {data.month}{confidenceLabel}
        </p>
        <p className="mt-0.5 font-bold" style={{ color: "#F97316" }}>
          전세가율: {data.ratio.toFixed(1)}%
        </p>
      </div>
    );
  }

  // Trend line tooltip
  if (data.month) {
    const confidenceLabel = data.isLowConfidence ? " (낮은 신뢰도)" : "";
    const isRentLine = entry.stroke === "#3B82F6";
    return (
      <div
        className="rounded-xl px-3 py-2 text-xs shadow-lg"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p style={{ color: "var(--color-text-tertiary)" }}>
          {data.month} · {data.count}건{confidenceLabel}
        </p>
        <p className="mt-0.5 font-bold" style={{ color: "var(--color-text-primary)" }}>
          {isRentLine ? "전세 이동중위가" : "3개월 이동중위가"}: {formatPrice(data.median ?? 0)}
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
  normalDots,
  directDealDots,
  trendLine,
  rentTrendLine,
  jeonseRatioLine,
  showJeonseRatio = false,
  sizeUnit = "sqm",
}: PriceHistoryChartProps) {
  const allDots = [...normalDots, ...directDealDots];
  if (allDots.length < 2 && trendLine.length < 2) return null;

  const hasRentTrend = (rentTrendLine?.length ?? 0) >= 2;
  const hasRatioOverlay = showJeonseRatio && (jeonseRatioLine?.length ?? 0) >= 2;

  // Compute Y domain from all prices
  const allPrices = [
    ...normalDots.map((d) => d.trade_price),
    ...directDealDots.map((d) => d.trade_price),
    ...directDealDots.filter((d) => d.prevPrice).map((d) => d.prevPrice as number),
    ...trendLine.map((d) => d.median),
    ...(rentTrendLine ?? []).map((d) => d.median),
  ].filter(Boolean);

  const minP = allPrices.length ? Math.min(...allPrices) : 0;
  const maxP = allPrices.length ? Math.max(...allPrices) : 0;
  const pad = (maxP - minP) * 0.05;
  const yDomain: [number, number] = [
    Math.max(0, Math.floor((minP - pad) / 1000) * 1000),
    Math.ceil((maxP + pad) / 1000) * 1000,
  ];

  // Build unified X-axis tick pool (all dates + trend mid-month dates)
  const solidData = solidTrendData(trendLine);
  const dashedData = dashedTrendData(trendLine);
  const solidRentData = hasRentTrend ? solidTrendData(rentTrendLine!) : [];
  const dashedRentData = hasRentTrend ? dashedTrendData(rentTrendLine!) : [];
  const ratioChartData = hasRatioOverlay ? ratioLineData(jeonseRatioLine!) : [];

  // Determine chart area accessibility summary
  const firstDate = allDots.length
    ? [...allDots].sort((a, b) => a.trade_date.localeCompare(b.trade_date))[0].trade_date
    : "";
  const lastDate = allDots.length
    ? [...allDots].sort((a, b) => b.trade_date.localeCompare(a.trade_date))[0].trade_date
    : "";

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold t-text">가격 추이</h2>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-[#059669]" />매매 추이
          </span>
          {hasRentTrend && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-[#3B82F6]" />전세 추이
            </span>
          )}
          {hasRatioOverlay && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-[#F97316]" />전세가율
            </span>
          )}
        </div>
      </div>

      <p className="sr-only">
        {firstDate} ~ {lastDate} 기간 가격 추이, 총 {allDots.length}건의 거래
      </p>

      <div className="h-[280px] sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 5, right: hasRatioOverlay ? 45 : 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="trade_date"
              type="category"
              allowDuplicatedCategory={false}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={formatDateLabel}
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
            <Tooltip content={<CustomTooltip sizeUnit={sizeUnit} />} />

            {/* Normal transaction dots — green */}
            <Scatter
              yAxisId={0}
              data={normalDots}
              fill="#059669"
              opacity={0.7}
              shape={<circle r={3} />}
            />

            {/* Direct deal dots — gray transparent */}
            <Scatter
              yAxisId={0}
              data={directDealDots}
              fill="#9CA3AF"
              opacity={0.4}
              shape={<circle r={3} />}
            />

            {/* Sale trend line solid segments (high-confidence months) */}
            <Line
              yAxisId={0}
              data={solidData}
              type="monotone"
              dataKey="y"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Sale trend line dashed segments (low-confidence months) */}
            <Line
              yAxisId={0}
              data={dashedData}
              type="monotone"
              dataKey="y"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Rent trend line solid segments (high-confidence months) */}
            {hasRentTrend && (
              <Line
                yAxisId={0}
                data={solidRentData}
                type="monotone"
                dataKey="y"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}

            {/* Rent trend line dashed segments (low-confidence months) */}
            {hasRentTrend && (
              <Line
                yAxisId={0}
                data={dashedRentData}
                type="monotone"
                dataKey="y"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                connectNulls={false}
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
                stroke="#F97316"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}

            {/* Direct deal connectors — dashed gray vertical lines */}
            <Customized
              component={(props: Record<string, unknown>) => (
                <DirectDealConnectors
                  directDealDots={directDealDots}
                  xAxisMap={props.xAxisMap as ConnectorProps["xAxisMap"]}
                  yAxisMap={props.yAxisMap as ConnectorProps["yAxisMap"]}
                />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
