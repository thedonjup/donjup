"use client";

import dynamic from "next/dynamic";

const PriceHistoryChart = dynamic(
  () => import("@/components/charts/PriceHistoryChart"),
  { ssr: false }
);

export default function PriceHistoryChartWrapper(props: {
  transactions: { trade_date: string; trade_price: number; size_sqm: number }[];
}) {
  return <PriceHistoryChart {...props} />;
}
