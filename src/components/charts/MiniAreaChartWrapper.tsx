"use client";

import dynamic from "next/dynamic";

const MiniAreaChart = dynamic(
  () => import("@/components/charts/MiniAreaChart"),
  { ssr: false }
);

export default function MiniAreaChartWrapper(props: {
  data: { value: number }[];
  color?: string;
  height?: number;
  label?: string;
}) {
  return <MiniAreaChart {...props} />;
}
