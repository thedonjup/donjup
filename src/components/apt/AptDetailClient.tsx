"use client";

import { useState, useMemo, createContext, useContext } from "react";
import PriceHistoryChart from "@/components/charts/PriceHistoryChart";
import TransactionTabs from "@/components/apt/TransactionTabs";
import {
  filterTransactions,
  computeMovingMedian,
  groupByMonth,
  computeMedianPrice,
  LOW_FLOOR_MAX,
} from "@/lib/price-normalization";

// DB의 size_sqm = 전용면적. 공급면적 = 전용 / 비율
function supplyArea(exclusiveSqm: number): number {
  // 소형(60㎡ 이하) 약 80%, 중형(60~85) 약 79%, 대형(85+) 약 78%
  const ratio = exclusiveSqm <= 60 ? 0.80 : exclusiveSqm <= 85 ? 0.79 : 0.78;
  return Math.round((exclusiveSqm / ratio) * 10) / 10;
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

  // 가장 거래가 많은 면적을 기본 선택 (NORM-01: 전체 면적 합산 제거, 최다 거래 면적 자동 선택)
  const mostTradedSize = useMemo(() => {
    const countMap = new Map<number, number>();
    saleTxns.forEach((t) => countMap.set(t.size_sqm, (countMap.get(t.size_sqm) ?? 0) + 1));
    let maxSize = saleTxns[0]?.size_sqm ?? null;
    let maxCount = 0;
    countMap.forEach((count, size) => {
      if (count > maxCount) { maxCount = count; maxSize = size; }
    });
    return maxSize;
  }, [saleTxns]);

  const [selectedSize, setSelectedSize] = useState<number | null>(mostTradedSize);

  // 저층 포함/제외 토글 (기본: 제외)
  const [includeLowFloor, setIncludeLowFloor] = useState(false);

  // 면적 목록 + 각 면적별 최근 매매가/전세가
  const sizeOptions = useMemo(() => {
    const sizes = new Set<number>();
    saleTxns.forEach((t) => sizes.add(t.size_sqm));
    rentTxns.forEach((t) => sizes.add(t.size_sqm));
    return Array.from(sizes).sort((a, b) => a - b);
  }, [saleTxns, rentTxns]);

  const sizePriceMap = useMemo(() => {
    const map = new Map<number, { highFloorSale: number | null; lowFloorSale: number | null; latestJeonse: number | null }>();
    for (const size of sizeOptions) {
      const sizeMatches = saleTxns.filter((t) => t.size_sqm === size);
      const highFloorTx = sizeMatches.find((t) => t.floor > LOW_FLOOR_MAX);
      const lowFloorTx = sizeMatches.find((t) => t.floor <= LOW_FLOOR_MAX);
      const jeonseTx = rentTxns.find((t) => t.size_sqm === size && t.rent_type === "전세");
      map.set(size, {
        highFloorSale: highFloorTx?.trade_price ?? null,
        lowFloorSale: lowFloorTx?.trade_price ?? null,
        latestJeonse: jeonseTx?.deposit ?? null,
      });
    }
    return map;
  }, [sizeOptions, saleTxns, rentTxns]);

  function formatSizeLabel(sqm: number): string {
    if (sizeUnit === "pyeong") return `${sqmToPyeong(sqm)}평`;
    return `${sqm}㎡`;
  }

  function formatSizeDetail(exclusiveSqm: number): string {
    const supply = supplyArea(exclusiveSqm);
    const exclPy = sqmToPyeong(exclusiveSqm);
    const supplyPy = sqmToPyeong(supply);
    if (sizeUnit === "pyeong") {
      return `전용 ${exclPy}평 / 공급 ${supplyPy}평`;
    }
    return `전용 ${exclusiveSqm}㎡ / 공급 ${supply}㎡`;
  }

  function formatPriceShort(v: number): string {
    if (v >= 10000) {
      const eok = Math.floor(v / 10000);
      const rest = Math.round((v % 10000) / 1000) * 1000;
      return rest > 0 ? `${eok}.${(rest / 1000).toFixed(0)}억` : `${eok}억`;
    }
    return `${v.toLocaleString()}만`;
  }

  // ── Normalization pipeline ──────────────────────────────────────

  // 최근 6개월 동일 면적 중위가 (이상거래 필터 기준)
  const recentMedian = useMemo(() => {
    if (!selectedSize) return 0;
    const last6Months = new Date();
    last6Months.setMonth(last6Months.getMonth() - 6);
    const dateStr = last6Months.toISOString().slice(0, 10);
    const recentPrices = saleTxns
      .filter(
        (t) =>
          t.size_sqm === selectedSize &&
          t.trade_date >= dateStr &&
          t.floor > LOW_FLOOR_MAX
      )
      .map((t) => t.trade_price);
    return computeMedianPrice(recentPrices);
  }, [saleTxns, selectedSize]);

  // filterTransactions: normal / directDeals / excluded
  const { normal, directDeals } = useMemo(() => {
    const sizeFiltered = selectedSize
      ? saleTxns.filter((t) => t.size_sqm === selectedSize)
      : saleTxns;
    return filterTransactions(sizeFiltered, {
      lowFloorMode: includeLowFloor ? 'include' : 'adjust',
      recentMedian,
    });
  }, [saleTxns, selectedSize, includeLowFloor, recentMedian]);

  // 3개월 이동중위가 추이선
  const trendLine = useMemo(() => {
    const monthly = groupByMonth(normal);
    return computeMovingMedian(monthly);
  }, [normal]);

  // prevPrice 조회: 각 직거래에 대해 직전 정상거래가 찾기
  const directDealsWithPrev = useMemo(() => {
    // Sort normal transactions by date descending for lookup
    const normalByDate = [...normal].sort((a, b) =>
      b.trade_date.localeCompare(a.trade_date)
    );

    return directDeals.map((dd) => {
      // Find most recent non-direct transaction before this direct deal's date
      const prev = normalByDate.find((n) => n.trade_date <= dd.trade_date);
      return {
        trade_date: dd.trade_date,
        trade_price: dd.trade_price,
        size_sqm: dd.size_sqm,
        deal_type: dd.deal_type,
        floor: dd.floor,
        isDirectDeal: true as const,
        prevPrice: prev?.trade_price,
      };
    });
  }, [directDeals, normal]);

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

          <div
            className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2 sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:pb-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {sizeOptions.map((size) => {
              const prices = sizePriceMap.get(size);
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className="shrink-0 rounded-xl px-3 py-2 text-left transition"
                  style={
                    selectedSize === size
                      ? { background: "var(--color-brand-600)", color: "#fff" }
                      : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
                  }
                >
                  <div className="text-xs font-bold">{formatSizeLabel(size)}</div>
                  <div className="hidden sm:block text-[10px] mt-0.5" style={{ opacity: 0.8 }}>
                    {formatSizeDetail(size)}
                  </div>
                  {(prices?.highFloorSale || prices?.lowFloorSale || prices?.latestJeonse) && (
                    <div className="hidden sm:block text-[10px] mt-0.5 tabular-nums" style={{ opacity: 0.7 }}>
                      {prices.highFloorSale ? `고층 ${formatPriceShort(prices.highFloorSale)}` : ""}
                      {prices.lowFloorSale ? ` / 저층 ${formatPriceShort(prices.lowFloorSale)}` : ""}
                      {prices.latestJeonse ? ` / 전세 ${formatPriceShort(prices.latestJeonse)}` : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 가격 추이 차트 — 정규화된 데이터 */}
      {saleTxns.length >= 2 && (
        <div className="mb-8">
          <PriceHistoryChart
            normalDots={normal.map((t) => ({
              trade_date: t.trade_date,
              trade_price: t.trade_price,
              size_sqm: t.size_sqm,
              deal_type: t.deal_type,
              floor: t.floor,
              isDirectDeal: false,
            }))}
            directDealDots={directDealsWithPrev}
            trendLine={trendLine}
            sizeUnit={sizeUnit}
          />
          {/* Annotation + 저층 포함 토글 */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              * 추이선: 3개월 이동중위가 · 저층 거래는 고층 환산가 적용 · 직거래(회색 점)는 추이선 미반영
            </p>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>저층 원가 보기</span>
              <input
                type="checkbox"
                checked={includeLowFloor}
                onChange={(e) => setIncludeLowFloor(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600"
              />
            </label>
          </div>
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
