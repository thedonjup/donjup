"use client";

import { formatPrice } from "@/lib/format";
import FilterChip from "./FilterChip";
import { MapTransaction, getMarkerColor, getMarkerLabel } from "./map-utils";

interface MapSidePanelProps {
  transactions: MapTransaction[];
  activeId: string | null;
  filter: "all" | "drop" | "high";
  setFilter: (f: "all" | "drop" | "high") => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  onItemClick: (item: MapTransaction) => void;
}

export default function MapSidePanel({
  transactions,
  activeId,
  filter,
  setFilter,
  panelOpen,
  setPanelOpen,
  onItemClick,
}: MapSidePanelProps) {
  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden border-r transition-all duration-300 ${
        panelOpen ? "w-[380px]" : "w-0"
      }`}
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-card)",
      }}
    >
      <div className="flex h-full w-[380px] flex-col">
        {/* Filters */}
        <div
          className="sticky top-0 z-10 border-b p-3"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-card)",
          }}
        >
          <div className="flex gap-2">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              color="#94a3b8"
            >
              전체
            </FilterChip>
            <FilterChip
              active={filter === "drop"}
              onClick={() => setFilter("drop")}
              color="#ef4444"
            >
              폭락/하락
            </FilterChip>
            <FilterChip
              active={filter === "high"}
              onClick={() => setFilter("high")}
              color="#10b981"
            >
              신고가
            </FilterChip>
          </div>
          <div
            className="mt-2 text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {transactions.length}개 단지
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {transactions.length === 0 ? (
            <div
              className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              <p>지도 데이터를 불러오는 중입니다</p>
              <p className="text-xs">전국 아파트 실거래가를 지도에서 확인할 수 있습니다. 폭락, 하락, 신고가 단지를 색상별로 구분하여 표시합니다.</p>
            </div>
          ) : (
            transactions.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick(item)}
                className="w-full border-b px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-elevated)]"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  borderLeft:
                    activeId === item.id
                      ? "3px solid #059669"
                      : "3px solid transparent",
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1.5 block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: getMarkerColor(item) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-sm font-bold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {item.apt_name}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {item.region_name} {item.dong_name || ""}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span
                        className="tabular-nums text-sm font-bold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {formatPrice(item.trade_price)}
                      </span>
                      {item.change_rate !== null && (
                        <span
                          className="tabular-nums text-xs font-semibold"
                          style={{
                            color:
                              item.change_rate < 0
                                ? "var(--color-semantic-drop)"
                                : "var(--color-semantic-rise)",
                          }}
                        >
                          {item.change_rate > 0 ? "+" : ""}
                          {item.change_rate.toFixed(1)}%
                        </span>
                      )}
                      {getMarkerLabel(item) && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white"
                          style={{ background: getMarkerColor(item) }}
                        >
                          {getMarkerLabel(item)}
                        </span>
                      )}
                    </div>
                    {item.size_sqm && (
                      <div
                        className="mt-0.5 text-[11px]"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {item.size_sqm}㎡
                        {item.trade_date ? ` · ${item.trade_date}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Panel toggle */}
        <button
          onClick={() => setPanelOpen(false)}
          className="flex items-center gap-1 border-t px-4 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-surface-elevated)]"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          패널 접기
        </button>
      </div>
    </div>
  );
}
