"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { groupByMonth, computeMedianPrice } from "@/lib/price-normalization";
import type { AptTransaction, AptRentTransaction } from "@/components/apt/AptDetailClient";

interface JeonseRatioChartProps {
  saleTxns: AptTransaction[];
  rentTxns: AptRentTransaction[];
}

export default function JeonseRatioChart({ saleTxns, rentTxns }: JeonseRatioChartProps) {
  // Compute monthly jeonse ratio trend (D-12)
  const ratioPoints = useMemo(() => {
    // Filter to pure jeonse only: no monthly rent (D-01 compliance)
    const pureJeonse = rentTxns.filter(
      (r) => r.rent_type === "전세" && r.monthly_rent === 0
    );

    // Map to groupByMonth-compatible shape
    const jeonseForGrouping = pureJeonse.map((r) => ({
      trade_date: r.trade_date,
      trade_price: r.deposit,
    }));

    const rentByMonth = groupByMonth(jeonseForGrouping);
    const saleByMonth = groupByMonth(saleTxns);

    const rentMap = new Map(rentByMonth.map((r) => [r.month, r.prices]));
    const saleMap = new Map(saleByMonth.map((s) => [s.month, s.prices]));

    // Find common months
    const commonMonths = [...rentMap.keys()].filter((m) => saleMap.has(m));

    return commonMonths
      .map((month) => {
        const rentPrices = rentMap.get(month)!;
        const salePrices = saleMap.get(month)!;
        const rentMedian = computeMedianPrice(rentPrices);
        const saleMedian = computeMedianPrice(salePrices);

        if (saleMedian === 0) return null;

        const ratio = Math.round((rentMedian / saleMedian) * 1000) / 10; // 1 decimal
        const totalCount = rentPrices.length + salePrices.length;
        const isLowConfidence = totalCount < 5; // D-13

        return { month, ratio, isLowConfidence, rentCount: rentPrices.length, saleCount: salePrices.length };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [saleTxns, rentTxns]);

  // Dual-line chart data: solid for high-confidence, dashed for low-confidence
  const chartData = useMemo(
    () =>
      ratioPoints.map((p) => ({
        month: p.month,
        solidRatio: p.isLowConfidence ? null : p.ratio,
        dashedRatio: p.isLowConfidence ? p.ratio : null,
      })),
    [ratioPoints]
  );

  // D-14: not enough data points
  if (chartData.length < 2) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold t-text">전세가율 추이</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => {
              const num = typeof value === "number" ? value : Number(value);
              return [`${isNaN(num) ? "-" : num.toFixed(1)}%`, "전세가율"];
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => String(label ?? "")}
            contentStyle={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            dataKey="solidRatio"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="전세가율"
          />
          <Line
            dataKey="dashedRatio"
            stroke="#3B82F6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
            name="전세가율 (데이터 부족)"
            legendType="none"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
        * 월별 전세 중위가 / 매매 중위가 기준 · 점선 = 거래 5건 미만
      </p>
    </div>
  );
}
