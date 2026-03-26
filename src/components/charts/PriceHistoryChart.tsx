"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Transaction {
  trade_date: string;
  trade_price: number;
  size_sqm: number;
}

function formatPrice(v: number): string {
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = v % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${v.toLocaleString()}만`;
}

function sqmToPyeong(sqm: number): number {
  return Math.round(sqm / 3.3058);
}

export default function PriceHistoryChart({
  transactions,
  externalSelectedSize,
  onSizeChange,
  sizeUnit = "sqm",
}: {
  transactions: Transaction[];
  externalSelectedSize?: number | null;
  onSizeChange?: (size: number | null) => void;
  sizeUnit?: "sqm" | "pyeong";
}) {
  const [internalSize, setInternalSize] = useState<number | null>(null);

  const selectedSize = externalSelectedSize !== undefined ? externalSelectedSize : internalSize;
  const handleSizeChange = (size: number | null) => {
    if (onSizeChange) onSizeChange(size);
    else setInternalSize(size);
  };

  const sizes = useMemo(
    () => [...new Set(transactions.map((t) => t.size_sqm))].sort((a, b) => a - b),
    [transactions]
  );

  const filtered = selectedSize
    ? transactions.filter((t) => t.size_sqm === selectedSize)
    : transactions;

  const data = [...filtered]
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
    .map((t) => ({
      date: t.trade_date.slice(5),
      fullDate: t.trade_date,
      price: t.trade_price,
      size: t.size_sqm,
    }));

  if (data.length < 2) return null;

  const minPrice = Math.min(...data.map((d) => d.price));
  const maxPrice = Math.max(...data.map((d) => d.price));
  const dateRange = `${data[0].fullDate} ~ ${data[data.length - 1].fullDate}`;

  function formatSizeLabel(sqm: number): string {
    return sizeUnit === "pyeong" ? `${sqmToPyeong(sqm)}평` : `${sqm}㎡`;
  }

  return (
    <div
      role="figure"
      aria-label="가격 추이 차트"
      className="rounded-2xl border p-5 t-card"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold t-text">가격 추이</h2>
        {sizes.length > 1 && !externalSelectedSize && !onSizeChange && (
          <div className="flex gap-1 flex-wrap" role="tablist" aria-label="면적 필터">
            <SizeTab label="전체" active={selectedSize === null} onClick={() => handleSizeChange(null)} />
            {sizes.map((s) => (
              <SizeTab key={s} label={formatSizeLabel(s)} active={selectedSize === s} onClick={() => handleSizeChange(s)} />
            ))}
          </div>
        )}
        {selectedSize && (
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {formatSizeLabel(selectedSize)}
          </span>
        )}
      </div>

      <p className="sr-only">
        {dateRange} 기간 중 최저 {formatPrice(minPrice)} ~ 최고 {formatPrice(maxPrice)}, 총 {data.length}건의 거래
      </p>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatPrice(v)} width={70} domain={["dataMin", "dataMax"]} />
          <Tooltip content={<CustomTooltip sizeUnit={sizeUnit} />} />
          <Area type="monotone" dataKey="price" stroke="#059669" strokeWidth={2} fill="url(#priceGrad)" dot={{ r: 3, fill: "#059669", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#059669", strokeWidth: 2, stroke: "#fff" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, sizeUnit = "sqm" }: { active?: boolean; payload?: Array<{ payload: { fullDate: string; price: number; size: number } }>; sizeUnit?: "sqm" | "pyeong" }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const sizeLabel = sizeUnit === "pyeong" ? `${Math.round(item.size / 3.3058)}평` : `${item.size}㎡`;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-border)" }}>
      <p style={{ color: "var(--color-text-tertiary)" }}>{item.fullDate} · {sizeLabel}</p>
      <p className="mt-0.5 font-bold" style={{ color: "var(--color-text-primary)" }}>{formatPrice(item.price)}</p>
    </div>
  );
}

function SizeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${active ? "bg-brand-600 text-white" : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-elevated)]"}`}
    >
      {label}
    </button>
  );
}
