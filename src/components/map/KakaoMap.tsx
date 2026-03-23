"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

declare global {
  interface Window {
    kakao: any;
  }
}

export interface MapTransaction {
  id: string;
  apt_name: string;
  region_name: string;
  dong_name: string | null;
  trade_price: number;
  change_rate: number | null;
  is_new_high: boolean;
  slug: string;
  latitude: number;
  longitude: number;
  size_sqm: number | null;
  trade_date: string | null;
}

function getMarkerColor(item: MapTransaction): string {
  if (item.change_rate !== null && item.change_rate <= -15) return "#dc2626";
  if (item.change_rate !== null && item.change_rate <= -10) return "#f97316";
  if (item.is_new_high) return "#10b981";
  return "#94a3b8";
}

function getMarkerLabel(item: MapTransaction): string {
  if (item.change_rate !== null && item.change_rate <= -15) return "폭락";
  if (item.change_rate !== null && item.change_rate <= -10) return "하락";
  if (item.is_new_high) return "신고가";
  return "";
}

function formatPrice(price: number): string {
  if (price >= 10000) {
    const billions = Math.floor(price / 10000);
    const remainder = price % 10000;
    return remainder > 0
      ? `${billions}억 ${remainder.toLocaleString()}만`
      : `${billions}억`;
  }
  return `${price.toLocaleString()}만`;
}

interface KakaoMapProps {
  transactions: MapTransaction[];
}

export default function KakaoMap({ transactions }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "drop" | "high">("all");

  // Wait for Kakao SDK
  useEffect(() => {
    const check = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setSdkReady(true));
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "drop")
      return t.change_rate !== null && t.change_rate <= -10;
    if (filter === "high") return t.is_new_high;
    return true;
  });

  // Initialize map
  useEffect(() => {
    if (!sdkReady || !mapRef.current) return;

    const kakao = window.kakao;
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    });

    mapInstanceRef.current = map;

    // Add zoom control
    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    return () => {
      markersRef.current = [];
      clustererRef.current = null;
    };
  }, [sdkReady]);

  // Update markers when data or filter changes
  useEffect(() => {
    if (!sdkReady || !mapInstanceRef.current) return;

    const kakao = window.kakao;
    const map = mapInstanceRef.current;

    // Clear existing
    if (clustererRef.current) {
      clustererRef.current.clear();
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    const markers: any[] = [];

    filteredTransactions.forEach((item) => {
      const position = new kakao.maps.LatLng(item.latitude, item.longitude);
      const color = getMarkerColor(item);

      // Create custom marker content
      const markerContent = document.createElement("div");
      markerContent.style.cssText = `
        width: 14px; height: 14px; border-radius: 50%;
        background: ${color}; border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3); cursor: pointer;
      `;

      const marker = new kakao.maps.CustomOverlay({
        position,
        content: markerContent,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });

      const label = getMarkerLabel(item);
      const rateStr =
        item.change_rate !== null
          ? `${item.change_rate > 0 ? "+" : ""}${item.change_rate.toFixed(1)}%`
          : "-";
      const rateColor =
        item.change_rate !== null && item.change_rate < 0
          ? "var(--color-semantic-drop)"
          : item.is_new_high
            ? "var(--color-semantic-rise)"
            : "var(--color-text-secondary)";

      const infoContent = `
        <div style="
          padding: 12px 16px; border-radius: 12px; min-width: 200px; max-width: 260px;
          background: var(--color-surface-card, #fff); border: 1px solid var(--color-border, #e2e8f0);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: inherit;
        ">
          <div style="font-weight: 700; font-size: 14px; color: var(--color-text-primary, #0f172a); margin-bottom: 4px;">
            ${item.apt_name}
            ${label ? `<span style="font-size: 11px; font-weight: 600; color: ${color}; margin-left: 4px;">${label}</span>` : ""}
          </div>
          <div style="font-size: 12px; color: var(--color-text-secondary, #475569); margin-bottom: 6px;">
            ${item.region_name} ${item.dong_name || ""}
          </div>
          <div style="font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; margin-bottom: 4px;">
            ${formatPrice(item.trade_price)}
            <span style="font-size: 12px; color: ${rateColor}; margin-left: 6px;">${rateStr}</span>
          </div>
          ${item.size_sqm ? `<div style="font-size: 11px; color: var(--color-text-tertiary, #94a3b8);">${item.size_sqm}㎡ ${item.trade_date ? `· ${item.trade_date}` : ""}</div>` : ""}
          <a href="/apt/${item.slug}" style="
            display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 600;
            color: #059669; text-decoration: none;
          ">상세보기 &rarr;</a>
        </div>
      `;

      markerContent.addEventListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setMap(null);
        }
        const infoWindow = new kakao.maps.CustomOverlay({
          position,
          content: infoContent,
          yAnchor: 1.3,
          xAnchor: 0.5,
        });
        infoWindow.setMap(map);
        infoWindowRef.current = infoWindow;
        setActiveId(item.id);
      });

      marker.setMap(map);
      markers.push(marker);
    });

    markersRef.current = markers;

    // Close infowindow when clicking map background
    kakao.maps.event.addListener(map, "click", () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.setMap(null);
        infoWindowRef.current = null;
        setActiveId(null);
      }
    });
  }, [sdkReady, filteredTransactions]);

  const handleItemClick = useCallback(
    (item: MapTransaction) => {
      if (!mapInstanceRef.current || !sdkReady) return;
      const kakao = window.kakao;
      const position = new kakao.maps.LatLng(item.latitude, item.longitude);
      mapInstanceRef.current.setCenter(position);
      mapInstanceRef.current.setLevel(5);
      setActiveId(item.id);

      // Show info window
      if (infoWindowRef.current) {
        infoWindowRef.current.setMap(null);
      }

      const color = getMarkerColor(item);
      const label = getMarkerLabel(item);
      const rateStr =
        item.change_rate !== null
          ? `${item.change_rate > 0 ? "+" : ""}${item.change_rate.toFixed(1)}%`
          : "-";
      const rateColor =
        item.change_rate !== null && item.change_rate < 0
          ? "var(--color-semantic-drop)"
          : item.is_new_high
            ? "var(--color-semantic-rise)"
            : "var(--color-text-secondary)";

      const infoContent = `
        <div style="
          padding: 12px 16px; border-radius: 12px; min-width: 200px; max-width: 260px;
          background: var(--color-surface-card, #fff); border: 1px solid var(--color-border, #e2e8f0);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: inherit;
        ">
          <div style="font-weight: 700; font-size: 14px; color: var(--color-text-primary, #0f172a); margin-bottom: 4px;">
            ${item.apt_name}
            ${label ? `<span style="font-size: 11px; font-weight: 600; color: ${color}; margin-left: 4px;">${label}</span>` : ""}
          </div>
          <div style="font-size: 12px; color: var(--color-text-secondary, #475569); margin-bottom: 6px;">
            ${item.region_name} ${item.dong_name || ""}
          </div>
          <div style="font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; margin-bottom: 4px;">
            ${formatPrice(item.trade_price)}
            <span style="font-size: 12px; color: ${rateColor}; margin-left: 6px;">${rateStr}</span>
          </div>
          ${item.size_sqm ? `<div style="font-size: 11px; color: var(--color-text-tertiary, #94a3b8);">${item.size_sqm}㎡ ${item.trade_date ? `· ${item.trade_date}` : ""}</div>` : ""}
          <a href="/apt/${item.slug}" style="
            display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 600;
            color: #059669; text-decoration: none;
          ">상세보기 &rarr;</a>
        </div>
      `;

      const infoWindow = new kakao.maps.CustomOverlay({
        position,
        content: infoContent,
        yAnchor: 1.3,
        xAnchor: 0.5,
      });
      infoWindow.setMap(mapInstanceRef.current);
      infoWindowRef.current = infoWindow;
    },
    [sdkReady],
  );

  return (
    <div className="flex h-[calc(100vh-64px)] w-full">
      {/* Left panel */}
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
              {filteredTransactions.length}개 단지
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div
                className="flex h-40 items-center justify-center text-sm"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                좌표가 있는 거래 데이터가 없습니다
              </div>
            ) : (
              filteredTransactions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
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

      {/* Expand handle (when panel is closed) */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-r-lg border border-l-0 px-1 py-4 transition-colors hover:bg-[var(--color-surface-elevated)]"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-card)",
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
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Map */}
      <div className="relative flex-1">
        {!sdkReady && (
          <div
            className="flex h-full items-center justify-center"
            style={{ background: "var(--color-surface-page)" }}
          >
            <div
              className="text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              지도를 불러오는 중...
            </div>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>

      {/* Mobile bottom sheet */}
      <MobileBottomSheet
        transactions={filteredTransactions}
        activeId={activeId}
        filter={filter}
        setFilter={setFilter}
        onItemClick={handleItemClick}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? color : "var(--color-surface-elevated)",
        color: active ? "#fff" : "var(--color-text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function MobileBottomSheet({
  transactions,
  activeId,
  filter,
  setFilter,
  onItemClick,
}: {
  transactions: MapTransaction[];
  activeId: string | null;
  filter: "all" | "drop" | "high";
  setFilter: (f: "all" | "drop" | "high") => void;
  onItemClick: (item: MapTransaction) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl border-t transition-all duration-300 md:hidden ${
        expanded ? "h-[60vh]" : "h-[140px]"
      }`}
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-card)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
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
