"use client";

import dynamic from "next/dynamic";
import type { MonthlyPoint, DirectDealPoint } from "@/components/charts/PriceHistoryChart";
import type { RatioPoint } from "@/components/apt/AptDetailClient";

type PriceHistoryChartProps = {
  trendLine: MonthlyPoint[];
  rentTrendLine?: MonthlyPoint[];
  jeonseRatioLine?: RatioPoint[];
  directDeals?: DirectDealPoint[];
  showJeonseRatio?: boolean;
};

const PriceHistoryChart = dynamic<PriceHistoryChartProps>(
  () => import("@/components/charts/PriceHistoryChart"),
  { ssr: false }
);

export default function PriceHistoryChartWrapper(props: PriceHistoryChartProps) {
  return <PriceHistoryChart {...props} />;
}
