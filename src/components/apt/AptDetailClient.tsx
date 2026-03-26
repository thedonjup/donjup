"use client";

import { useState, useMemo, createContext, useContext } from "react";
import PriceHistoryChart from "@/components/charts/PriceHistoryChart";
import TransactionTabs from "@/components/apt/TransactionTabs";

// 전용면적 비율 (일반적으로 공급면적의 약 79~82%)
function exclusiveArea(supplySqm: number): number {
  // 소형(60㎡ 이하) 약 80%, 중형(60~85) 약 79%, 대형(85+) 약 78%
  const ratio = supplySqm <= 60 ? 0.80 : supplySqm <= 85 ? 0.79 : 0.78;
  return Math.round(supplySqm * ratio * 10) / 10;
}

function sqmToPyeong(sqm: number): number {
  return Math.round(sqm / 3.3058);
}

interface SizeUnitContextType {
  sizeUnit: "sqm" | "pyeong";
  setSizeUnit: (u: "sqm" | "pyeong") => void;
  selectedSize: number | null;
  setSelectedSize: (s: number | null) => void;
  formatSizeLabel: (sqm: number) => string;
  formatSizeDetail: (sqm: number) => string;
}

const SizeUnitContext = createContext<SizeUnitContextType | null>(null);
export function useSizeUnit() {
  const ctx = useContext(SizeUnitContext);
  if (!ctx) throw new Error("useSizeUnit must be used within AptDetailClient");
  return ctx;
}

export interface AptTransaction {
  id: string;
  trade_date: string;
  trade_price: number;
  size_sqm: number;
  floor: number;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  deal_type: string | null;
  drop_level?: string;
}

export interface AptRentTransaction {
  id: string;
  size_sqm: number;
  floor: number | null;
  deposit: number;
  monthly_rent: number;
  rent_type: string;
  contract_type: string | null;
  trade_date: string;
}

export default function AptDetailClient({
  saleTxns,
  rentTxns,
}: {
  saleTxns: AptTransaction[];
  rentTxns: AptRentTransaction[];
}) {
  const [sizeUnit, setSizeUnit] = useState<"sqm" | "pyeong">("sqm");
  const [selectedSize, setSelectedSize] = useState<number | null>(null);

  // 면적 목록 + 각 면적별 최근 매매가/전세가
  const sizeOptions = useMemo(() => {
    const sizes = new Set<number>();
    saleTxns.forEach((t) => sizes.add(t.size_sqm));
    rentTxns.forEach((t) => sizes.add(t.size_sqm));
    return Array.from(sizes).sort((a, b) => a - b);
  }, [saleTxns, rentTxns]);

  const sizePriceMap = useMemo(() => {
    const map = new Map<number, { latestSale: number | null; latestJeonse: number | null }>();
    for (const size of sizeOptions) {
      const saleTx = saleTxns.find((t) => t.size_sqm === size);
      const jeonseTx = rentTxns.find((t) => t.size_sqm === size && t.rent_type === "전세");
      map.set(size, {
        latestSale: saleTx?.trade_price ?? null,
        latestJeonse: jeonseTx?.deposit ?? null,
      });
    }
    return map;
  }, [sizeOptions, saleTxns, rentTxns]);

  function formatSizeLabel(sqm: number): string {
    if (sizeUnit === "pyeong") return `${sqmToPyeong(sqm)}평`;
    return `${sqm}㎡`;
  }

  function formatSizeDetail(sqm: number): string {
    const supplyPy = sqmToPyeong(sqm);
    const excl = exclusiveArea(sqm);
    const exclPy = sqmToPyeong(excl);
    if (sizeUnit === "pyeong") {
      return `공급 ${supplyPy}평 / 전용 ${exclPy}평`;
    }
    return `공급 ${sqm}㎡ / 전용 ${excl}㎡`;
  }

  function formatPriceShort(v: number): string {
    if (v >= 10000) {
      const eok = Math.floor(v / 10000);
      const rest = Math.round((v % 10000) / 1000) * 1000;
      return rest > 0 ? `${eok}.${(rest / 1000).toFixed(0)}억` : `${eok}억`;
    }
    return `${v.toLocaleString()}만`;
  }

  const ctxValue: SizeUnitContextType = {
    sizeUnit,
    setSizeUnit,
    selectedSize,
    setSelectedSize,
    formatSizeLabel,
    formatSizeDetail,
  };

  return (
    <SizeUnitContext.Provider value={ctxValue}>
      {/* 면적 선택 + ㎡/평 토글 (전역) */}
      {sizeOptions.length > 0 && (
        <div className="mb-6 rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold t-text">면적 선택</span>
            <button
              onClick={() => setSizeUnit((u) => (u === "sqm" ? "pyeong" : "sqm"))}
              className="rounded-full px-3 py-1.5 text-xs font-bold transition"
              style={{ background: "var(--color-brand-600)", color: "#fff" }}
              aria-label={sizeUnit === "sqm" ? "평으로 전환" : "제곱미터로 전환"}
            >
              {sizeUnit === "sqm" ? "㎡ → 평 전환" : "평 → ㎡ 전환"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSize(null)}
              className="rounded-xl px-3 py-2 text-xs font-bold transition"
              style={
                selectedSize === null
                  ? { background: "var(--color-brand-600)", color: "#fff" }
                  : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
              }
            >
              전체
            </button>
            {sizeOptions.map((size) => {
              const prices = sizePriceMap.get(size);
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className="rounded-xl px-3 py-2 text-left transition"
                  style={
                    selectedSize === size
                      ? { background: "var(--color-brand-600)", color: "#fff" }
                      : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
                  }
                >
                  <div className="text-xs font-bold">{formatSizeLabel(size)}</div>
                  <div className="text-[10px] mt-0.5" style={{ opacity: 0.8 }}>
                    {formatSizeDetail(size)}
                  </div>
                  {(prices?.latestSale || prices?.latestJeonse) && (
                    <div className="text-[10px] mt-0.5 tabular-nums" style={{ opacity: 0.7 }}>
                      {prices.latestSale ? `매매 ${formatPriceShort(prices.latestSale)}` : ""}
                      {prices.latestSale && prices.latestJeonse ? " / " : ""}
                      {prices.latestJeonse ? `전세 ${formatPriceShort(prices.latestJeonse)}` : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 가격 추이 차트 */}
      {saleTxns.length >= 2 && (
        <div className="mb-8">
          <PriceHistoryChart
            transactions={saleTxns.map((t) => ({
              trade_date: t.trade_date,
              trade_price: t.trade_price,
              size_sqm: t.size_sqm,
            }))}
            externalSelectedSize={selectedSize}
            onSizeChange={setSelectedSize}
            sizeUnit={sizeUnit}
          />
        </div>
      )}

      {/* 거래 이력 */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-bold t-text">거래 이력</h2>
        <TransactionTabs
          saleTxns={saleTxns}
          rentTxns={rentTxns}
          externalSelectedSize={selectedSize}
          sizeUnit={sizeUnit}
        />
      </div>
    </SizeUnitContext.Provider>
  );
}
