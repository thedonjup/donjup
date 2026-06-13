"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapTransaction,
  getMarkerColor,
  buildInfoWindowContent,
} from "./map-utils";
import { mapEmptyStateCopy } from "@/lib/map-state";
import MapSidePanel from "./MapSidePanel";
import MobileBottomSheet from "./MobileBottomSheet";

export type { MapTransaction } from "./map-utils";

declare global {
  interface Window {
    kakao: typeof kakao;
  }
}

interface KakaoMapProps {
  transactions: MapTransaction[];
  initialComplexId?: string;
  dataUnavailable?: boolean;
}

export default function KakaoMap({
  transactions,
  initialComplexId,
  dataUnavailable = false,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const clustererRef = useRef<kakao.maps.services.MarkerClusterer | null>(null);
  const infoWindowRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const initialFocusedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "drop" | "high">("all");

  // Load & wait for Kakao Maps SDK (이 페이지에서만 로드)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) return;

    const loadSdk = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setSdkReady(true));
        return;
      }
      // SDK 스크립트 동적 삽입
      if (!document.querySelector('script[src*="dapi.kakao.com"]')) {
        const script = document.createElement("script");
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services,clusterer`;
        script.onload = () => {
          window.kakao.maps.load(() => setSdkReady(true));
        };
        document.head.appendChild(script);
      } else {
        setTimeout(loadSdk, 200);
      }
    };
    loadSdk();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "drop")
      return t.change_rate !== null && t.change_rate <= -10;
    if (filter === "high") return t.is_new_high;
    return true;
  });
  const mapDataNotice = dataUnavailable
    ? mapEmptyStateCopy(true, filter)
    : null;

  const focusItem = useCallback(
    (item: MapTransaction) => {
      if (!mapInstanceRef.current || !sdkReady) return;
      const kakao = window.kakao;
      const position = new kakao.maps.LatLng(item.latitude, item.longitude);
      mapInstanceRef.current.setCenter(position);
      mapInstanceRef.current.setLevel(5);
      setActiveId(item.id);

      if (infoWindowRef.current) {
        infoWindowRef.current.setMap(null);
      }

      const infoContent = buildInfoWindowContent(item);
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

  // Initialize map
  useEffect(() => {
    if (!sdkReady || !mapRef.current) return;

    const kakao = window.kakao;
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    });

    mapInstanceRef.current = map;

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

    if (clustererRef.current) {
      clustererRef.current.clear();
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (infoWindowRef.current) {
      infoWindowRef.current.setMap(null);
    }

    const markers: kakao.maps.CustomOverlay[] = [];

    filteredTransactions.forEach((item) => {
      const position = new kakao.maps.LatLng(item.latitude, item.longitude);
      const color = getMarkerColor(item);

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

      const infoContent = buildInfoWindowContent(item);

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
      focusItem(item);
    },
    [focusItem],
  );

  useEffect(() => {
    if (!initialComplexId || initialFocusedRef.current || !sdkReady) return;

    const item = transactions.find((transaction) =>
      transaction.complex_id === initialComplexId ||
      transaction.govt_complex_id === initialComplexId ||
      transaction.slug === initialComplexId
    );

    if (!item) return;

    const timer = window.setTimeout(() => {
      initialFocusedRef.current = true;
      focusItem(item);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [focusItem, initialComplexId, sdkReady, transactions]);

  return (
    <div className="flex h-[calc(100dvh-64px)] w-full">
      <MapSidePanel
        transactions={filteredTransactions}
        activeId={activeId}
        filter={filter}
        setFilter={setFilter}
        panelOpen={panelOpen}
        setPanelOpen={setPanelOpen}
        onItemClick={handleItemClick}
        dataUnavailable={dataUnavailable}
      />

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
            aria-live="polite"
            className="flex h-full items-center justify-center"
            style={{ background: "var(--color-surface-page)" }}
          >
            <div
              className="text-sm whitespace-nowrap"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              지도를 불러오는 중...
            </div>
          </div>
        )}
        <p className="sr-only">
          카카오맵 기반 전국 아파트 실거래가 지도입니다.
          현재 {filteredTransactions.length}건의 거래가 표시되어 있습니다.
          지도 조작은 마우스 또는 터치로 가능합니다.
        </p>
        <div
          ref={mapRef}
          role="application"
          aria-label="전국 아파트 실거래가 지도"
          aria-roledescription="인터랙티브 지도"
          className="h-full w-full"
        />
        {mapDataNotice && (
          <div
            role="status"
            className="absolute left-4 right-4 top-4 z-10 rounded-xl border p-4 text-sm shadow-sm md:left-6 md:right-auto md:max-w-sm"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
              color: "var(--color-text-secondary)",
            }}
          >
            <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {mapDataNotice.title}
            </p>
            <p className="mt-1 text-xs">{mapDataNotice.description}</p>
          </div>
        )}
      </div>

      <MobileBottomSheet
        transactions={filteredTransactions}
        activeId={activeId}
        filter={filter}
        setFilter={setFilter}
        onItemClick={handleItemClick}
        dataUnavailable={dataUnavailable}
      />
    </div>
  );
}
