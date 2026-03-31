"use client";

import { useState, useMemo, createContext, useContext } from "react";
import PriceHistoryChartWrapper from "@/components/charts/PriceHistoryChartWrapper";
import TransactionTabs from "@/components/apt/TransactionTabs";
import {
  filterTransactions,
  computeMovingMedian,
  groupByMonth,
  computeMedianPrice,
  LOW_FLOOR_MAX,
} from "@/lib/price-normalization";
import { sqmToPyeong, formatPriceShort } from "@/lib/format";

// DB의 size_sqm = 전용면적. 공급면적 = 전용 / 비율
function supplyArea(exclusiveSqm: number): number {
  // 소형(60㎡ 이하) 약 80%, 중형(60~85) 약 79%, 대형(85+) 약 78%
  const ratio = exclusiveSqm <= 60 ? 0.80 : exclusiveSqm <= 85 ? 0.79 : 0.78;
  return Math.round((exclusiveSqm / ratio) * 10) / 10;
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

export interface RatioPoint {
  month: string;
  ratio: number;
  isLowConfidence: boolean;
}

type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";
const PERIOD_MONTHS: Record<PeriodKey, number | null> = {
  "1m": 1, "3m": 3, "6m": 6, "1y": 12, "all": null,
};
const PERIOD_LABELS: Record<PeriodKey, string> = {
  "1m": "1개월", "3m": "3개월", "6m": "6개월", "1y": "1년", "all": "전체",
};

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

  // 전세가율 표시 토글 (기본: OFF)
  const [showJeonseRatio, setShowJeonseRatio] = useState(false);

  // 기간 선택 상태
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("all");

  // 기간 기준 컷오프 날짜
  const periodCutoff = useMemo(() => {
    const months = PERIOD_MONTHS[selectedPeriod];
    if (!months) return null;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().slice(0, 10);
  }, [selectedPeriod]);

  // 기간 필터링된 매매/전세 거래
  const filteredSaleTxns = useMemo(() => {
    if (!periodCutoff) return saleTxns;
    return saleTxns.filter((t) => t.trade_date >= periodCutoff);
  }, [saleTxns, periodCutoff]);

  const filteredRentTxns = useMemo(() => {
    if (!periodCutoff) return rentTxns;
    return rentTxns.filter((t) => t.trade_date >= periodCutoff);
  }, [rentTxns, periodCutoff]);

  // 면적 목록 + 각 면적별 최근 매매가/전세가
  const sizeOptions = useMemo(() => {
    const sizes = new Set<number>();
    saleTxns.forEach((t) => sizes.add(t.size_sqm));
    rentTxns.forEach((t) => sizes.add(t.size_sqm));
    return Array.from(sizes).sort((a, b) => a - b);
  }, [saleTxns, rentTxns]);

  const sizePriceMap = useMemo(() => {
    const map = new Map<number, {
      highFloorSale: number | null;
      lowFloorSale: number | null;
      latestJeonse: number | null;
      latestSale: number | null;
      gapAmount: number | null;
      jeonseRatio: number | null;
    }>();
    for (const size of sizeOptions) {
      const sizeMatches = saleTxns.filter((t) => t.size_sqm === size);
      const highFloorTx = sizeMatches.find((t) => t.floor > LOW_FLOOR_MAX);
      const lowFloorTx = sizeMatches.find((t) => t.floor <= LOW_FLOOR_MAX);
      const jeonseTx = rentTxns.find(
        (t) => t.size_sqm === size && t.rent_type === "전세" && t.monthly_rent === 0
      );
      const latestSale = sizeMatches[0]?.trade_price ?? null;
      const latestJeonse = jeonseTx?.deposit ?? null;
      const gapAmount = (latestSale !== null && latestJeonse !== null) ? latestSale - latestJeonse : null;
      const jeonseRatio = (latestSale !== null && latestJeonse !== null && latestSale > 0)
        ? Math.round((latestJeonse / latestSale) * 1000) / 10
        : null;
      map.set(size, {
        highFloorSale: highFloorTx?.trade_price ?? null,
        lowFloorSale: lowFloorTx?.trade_price ?? null,
        latestJeonse,
        latestSale,
        gapAmount,
        jeonseRatio,
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

  // ── Normalization pipeline ──────────────────────────────────────

  // 최근 6개월 동일 면적 중위가 (이상거래 필터 기준) — 전체 saleTxns 사용 (필터링 전)
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

  // filterTransactions: normal / directDeals / excluded (기간 필터링된 데이터 사용)
  const { normal, directDeals } = useMemo(() => {
    const sizeFiltered = selectedSize
      ? filteredSaleTxns.filter((t) => t.size_sqm === selectedSize)
      : filteredSaleTxns;
    return filterTransactions(sizeFiltered, {
      lowFloorMode: includeLowFloor ? 'include' : 'adjust',
      recentMedian,
    });
  }, [filteredSaleTxns, selectedSize, includeLowFloor, recentMedian]);

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

  // 전세 추이선: 순수전세(monthly_rent === 0) 기반 3개월 이동중위가
  const rentTrendLine = useMemo(() => {
    if (!selectedSize) return [];
    const pureJeonse = filteredRentTxns.filter(
      (t) => t.size_sqm === selectedSize && t.monthly_rent === 0
    );
    const forGrouping = pureJeonse.map((r) => ({
      trade_date: r.trade_date,
      trade_price: r.deposit,
    }));
    const monthly = groupByMonth(forGrouping);
    return computeMovingMedian(monthly);
  }, [filteredRentTxns, selectedSize]);

  // 전세가율 추이: 월별 전세중위가 / 매매중위가 x 100
  const jeonseRatioLine = useMemo((): RatioPoint[] => {
    if (!selectedSize) return [];
    const pureJeonse = filteredRentTxns.filter(
      (t) => t.size_sqm === selectedSize && t.rent_type === "전세" && t.monthly_rent === 0
    );
    const jeonseForGrouping = pureJeonse.map((r) => ({
      trade_date: r.trade_date, trade_price: r.deposit,
    }));
    const saleForGrouping = filteredSaleTxns
      .filter((t) => t.size_sqm === selectedSize)
      .map((t) => ({ trade_date: t.trade_date, trade_price: t.trade_price }));
    const rentByMonth = groupByMonth(jeonseForGrouping);
    const saleByMonth = groupByMonth(saleForGrouping);
    const rentMap = new Map(rentByMonth.map((r) => [r.month, r.prices]));
    const saleMap = new Map(saleByMonth.map((s) => [s.month, s.prices]));
    const commonMonths = [...rentMap.keys()].filter((m) => saleMap.has(m));
    return commonMonths
      .map((month) => {
        const rentPrices = rentMap.get(month)!;
        const salePrices = saleMap.get(month)!;
        const rentMedian = computeMedianPrice(rentPrices);
        const saleMedian = computeMedianPrice(salePrices);
        if (saleMedian === 0) return null;
        const ratio = Math.round((rentMedian / saleMedian) * 1000) / 10;
        const isLowConfidence = (rentPrices.length + salePrices.length) < 5;
        return { month, ratio, isLowConfidence };
      })
      .filter((p): p is RatioPoint => p !== null)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredRentTxns, filteredSaleTxns, selectedSize]);

  function getJeonseRatioColor(ratio: number | null): string {
    if (ratio === null) return "var(--color-text-primary)";
    if (ratio >= 70) return "var(--color-semantic-drop)";     // red per D-09
    if (ratio >= 60) return "var(--color-semantic-warn)";      // amber per D-09
    return "var(--color-semantic-rise)";                       // green per D-09
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
              style={{ background: "var(--color-brand-600)", color: "var(--color-text-inverted)" }}
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
                      ? { background: "var(--color-brand-600)", color: "var(--color-text-inverted)" }
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

      {/* GAP 지표 카드 — 전세가율 / 갭 금액 (D-07, D-08) */}
      {selectedSize && (() => {
        const info = sizePriceMap.get(selectedSize);
        const ratio = info?.jeonseRatio ?? null;
        const gap = info?.gapAmount ?? null;
        const ratioColor = getJeonseRatioColor(ratio);
        return (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>최근 전세가</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums t-text">
                {info?.latestJeonse ? formatPriceShort(info.latestJeonse) : "-"}
              </p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>전세가율</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums" style={{ color: ratioColor }}>
                {ratio !== null ? `${ratio.toFixed(1)}%` : "-"}
              </p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>갭 금액</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums t-text">
                {gap !== null ? formatPriceShort(gap) : "-"}
              </p>
            </div>
          </div>
        );
      })()}

      {/* 가격 추이 차트 — 정규화된 데이터 */}
      {saleTxns.length >= 2 && (
        <div className="mb-8">
          {/* 기간 선택 탭 */}
          <div className="flex gap-1.5 mb-3">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedPeriod(key)}
                className="rounded-full px-3 py-1 text-xs font-bold transition"
                style={
                  selectedPeriod === key
                    ? { background: "var(--color-brand-600)", color: "var(--color-text-inverted)" }
                    : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
                }
              >
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>

          <PriceHistoryChartWrapper
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
            rentTrendLine={rentTrendLine}
            jeonseRatioLine={jeonseRatioLine}
            showJeonseRatio={showJeonseRatio}
            sizeUnit={sizeUnit}
          />
          {/* Annotation + 저층 포함 토글 + 전세가율 표시 토글 */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              * 추이선: 3개월 이동중위가 · 저층 거래는 고층 환산가 적용 · 직거래(회색 점)는 추이선 미반영
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>전세가율 표시</span>
                <input
                  type="checkbox"
                  checked={showJeonseRatio}
                  onChange={(e) => setShowJeonseRatio(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600"
                />
              </label>
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
