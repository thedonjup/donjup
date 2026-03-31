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
}

function formatEok(price: number): string {
  const eok = price / 10000;
  return `${eok.toFixed(1)}억`;
}

interface TooltipPayloadEntry {
  payload?: DataPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p style={{ color: "var(--color-text-tertiary)" }}>
        {d.month} · {d.count}건
      </p>
      <p className="mt-0.5 font-bold" style={{ color: "var(--color-chart-index)" }}>
        {formatEok(d.medianPrice)}
      </p>
      <p className="mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
        지수 {d.index.toFixed(1)}
      </p>
    </div>
  );
}

export default function ClusterIndexChart({ data }: ClusterIndexChartProps) {
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

  // Find the base price (index=100 point) for reference line label
  const basePoint = data.find((d) => d.index === 100) ?? data[0];

  // Y-axis domain based on median prices
  const prices = data.map((d) => d.medianPrice);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad = (maxP - minP) * 0.08;
  const yMin = Math.max(0, Math.floor((minP - pad) / 1000) * 1000);
  const yMax = Math.ceil((maxP + pad) / 1000) * 1000;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <XAxis
          dataKey="month"
          interval="preserveStartEnd"
          tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
          tickLine={false}
          axisLine={false}
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
        <Tooltip content={<CustomTooltip />} />
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
  );
}
