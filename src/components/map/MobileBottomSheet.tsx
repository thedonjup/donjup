"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import FilterChip from "./FilterChip";
import { MapTransaction, getMarkerColor } from "./map-utils";

interface MobileBottomSheetProps {
  transactions: MapTransaction[];
  activeId: string | null;
  filter: "all" | "drop" | "high";
  setFilter: (f: "all" | "drop" | "high") => void;
  onItemClick: (item: MapTransaction) => void;
}

export default function MobileBottomSheet({
  transactions,
  filter,
  setFilter,
  onItemClick,
}: MobileBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl border-t transition-all duration-300 md:hidden ${
        expanded ? "h-[60vh]" : "h-[160px]"
      }`}
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-card)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Drag handle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full justify-center py-2"
      >
        <div
          className="h-1 w-10 rounded-full"
          style={{ background: "var(--color-text-tertiary)" }}
        />
      </button>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 pb-2">
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
        <span
          className="ml-auto self-center text-xs"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {transactions.length}개
        </span>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto px-4" style={{ maxHeight: "calc(100% - 70px)" }}>
        {transactions.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onItemClick(item);
              setExpanded(false);
            }}
            className="flex w-full items-center gap-3 border-b py-2.5 text-left"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <span
              className="block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: getMarkerColor(item) }}
            />
            <div className="min-w-0 flex-1">
              <span
                className="block truncate text-sm font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {item.apt_name}
              </span>
              <span className="flex items-baseline gap-2">
                <span
                  className="tabular-nums text-xs font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatPrice(item.trade_price)}
                </span>
                {item.change_rate !== null && (
                  <span
                    className="tabular-nums text-[11px] font-semibold"
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
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
