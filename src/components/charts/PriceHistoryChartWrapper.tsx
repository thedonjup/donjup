"use client";

import dynamic from "next/dynamic";
import type { ChartTransaction, TrendPoint } from "@/components/charts/PriceHistoryChart";

const PriceHistoryChart = dynamic(
  () => import("@/components/charts/PriceHistoryChart"),
  { ssr: false }
);

export default function PriceHistoryChartWrapper(props: {
  normalDots: ChartTransaction[];
  directDealDots: ChartTransaction[];
  trendLine: TrendPoint[];
  sizeUnit?: "sqm" | "pyeong";
}) {
  return <PriceHistoryChart {...props} />;
}
