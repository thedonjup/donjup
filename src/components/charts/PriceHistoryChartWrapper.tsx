"use client";

import dynamic from "next/dynamic";
import type { ChartTransaction, TrendPoint } from "@/components/charts/PriceHistoryChart";
import type { RatioPoint } from "@/components/apt/AptDetailClient";

type PriceHistoryChartProps = {
  normalDots: ChartTransaction[];
  directDealDots: ChartTransaction[];
  trendLine: TrendPoint[];
  rentTrendLine?: TrendPoint[];
  jeonseRatioLine?: RatioPoint[];
  showJeonseRatio?: boolean;
  sizeUnit?: "sqm" | "pyeong";
};

const PriceHistoryChart = dynamic<PriceHistoryChartProps>(
  () => import("@/components/charts/PriceHistoryChart"),
  { ssr: false }
);

export default function PriceHistoryChartWrapper(props: PriceHistoryChartProps) {
  return <PriceHistoryChart {...props} />;
}
