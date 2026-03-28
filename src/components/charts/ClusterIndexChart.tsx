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

interface ClusterIndexChartProps {
  data: { month: string; index: number; count: number }[];
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

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <XAxis
          dataKey="month"
          interval="preserveStartEnd"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          width={50}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [typeof value === "number" ? value.toFixed(1) : value, "지수"]}
        />
        <ReferenceLine
          y={100}
          stroke="#9CA3AF"
          strokeDasharray="4 4"
          label={{ value: "기준(100)", position: "insideTopRight", fontSize: 11, fill: "#9CA3AF" }}
        />
        <Line
          type="monotone"
          dataKey="index"
          stroke="#2B579A"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
