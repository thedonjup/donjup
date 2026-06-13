"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  month: string;
  index: number;
  medianPrice: number;
  count: number;
}

interface ClusterIndexChartProps {
  data: DataPoint[];
  baseMonth?: string; // "YYYY-MM" of base (index=100)
}

function formatEok(price: number): string {
  const eok = price / 10000;
  return `${eok.toFixed(1)}억`;
}

// "YYYY-MM" → "YY년 M월"
function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y.slice(2)}년 ${Number(m)}월`;
}

interface TooltipPayloadEntry {
  payload?: DataPoint;
}

function CustomTooltip({
  active,
  payload,
  basePrice,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  basePrice: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;

  const diff = d.medianPrice - basePrice;
  const diffSign = diff >= 0 ? "▲" : "▼";
  const diffColor = diff >= 0 ? "var(--color-semantic-rise)" : "var(--color-semantic-drop)";

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p style={{ color: "var(--color-text-tertiary)" }}>
        {formatMonthLabel(d.month)} · {d.count}건
      </p>
      <p className="mt-0.5 font-bold" style={{ color: "var(--color-chart-index)" }}>
        {formatEok(d.medianPrice)}
      </p>
      <p className="mt-0.5" style={{ color: diffColor }}>
        기준 대비 {diffSign} {formatEok(Math.abs(diff))} (지수 {d.index.toFixed(1)})
      </p>
    </div>
  );
}

export default function ClusterIndexChart({ data, baseMonth: _baseMonth }: ClusterIndexChartProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          height: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-secondary)",
          fontSize: "14px",
        }}
      >
        데이터 없음
      </div>
    );
  }

  const basePoint = data.find((d) => d.index === 100) ?? data[0];
  const latestPoint = data[data.length - 1];

  // Y-axis domain based on median prices
  const prices = data.map((d) => d.medianPrice);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad = (maxP - minP) * 0.08;
  const yMin = Math.max(0, Math.floor((minP - pad) / 1000) * 1000);
  const yMax = Math.ceil((maxP + pad) / 1000) * 1000;

  // Summary: 현재가 vs 기준가
  const diff = latestPoint.medianPrice - basePoint.medianPrice;
  const diffSign = diff >= 0 ? "▲" : "▼";
  const diffColor = diff >= 0 ? "var(--color-semantic-rise)" : "var(--color-semantic-drop)";

  return (
    <div>
      {/* 현재 가격 요약 */}
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text-primary)" }}>
          {formatEok(latestPoint.medianPrice)}
          <span
            style={{ fontSize: "14px", fontWeight: 600, marginLeft: "8px", color: diffColor }}
          >
            {diffSign} {formatEok(Math.abs(diff))}
          </span>
        </p>
        <p style={{ fontSize: "12px", color: "var(--color-text-tertiary)", marginTop: "2px" }}>
          {formatMonthLabel(basePoint.month)} {formatEok(basePoint.medianPrice)} 기준 · 지수 {latestPoint.index.toFixed(1)}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="month"
            interval="preserveStartEnd"
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatMonthLabel}
          />
          <YAxis
            dataKey="medianPrice"
            width={55}
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatEok}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip basePrice={basePoint.medianPrice} />} />
          <ReferenceLine
            y={basePoint.medianPrice}
            stroke="var(--color-chart-neutral)"
            strokeDasharray="4 4"
            label={{
              value: `기준 ${formatEok(basePoint.medianPrice)}`,
              position: "insideTopRight",
              fontSize: 11,
              fill: "var(--color-chart-neutral)",
            }}
          />
          <Line
            type="monotone"
            dataKey="medianPrice"
            stroke="var(--color-chart-index)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 차트 읽는 법 설명 */}
      <p style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "8px", lineHeight: "1.6" }}>
        * {formatMonthLabel(basePoint.month)} 중위 거래가 {formatEok(basePoint.medianPrice)}을 기준(지수 100)으로, 이후 월별 중위 거래가의 변동을 나타냅니다.
        직거래는 제외하며, 월 3건 이상 거래가 있는 달만 표시합니다.
      </p>
    </div>
  );
}
