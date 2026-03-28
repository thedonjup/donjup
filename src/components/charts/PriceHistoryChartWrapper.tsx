"use client";

import dynamic from "next/dynamic";
import type { ChartTransaction, TrendPoint } from "@/components/charts/PriceHistoryChart";
import type { RatioPoint } from "@/components/apt/AptDetailClient";

const PriceHistoryChart = dynamic(
  () => import("@/components/charts/PriceHistoryChart"),
  { ssr: false }
);

export default function PriceHistoryChartWrapper(props: {
  normalDots: ChartTransaction[];
  directDealDots: ChartTransaction[];
  trendLine: TrendPoint[];
  rentTrendLine?: TrendPoint[];
  jeonseRatioLine?: RatioPoint[];
  showJeonseRatio?: boolean;
  sizeUnit?: "sqm" | "pyeong";
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PriceHistoryChart {...(props as any)} />;
}
