"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapTransaction,
  getMarkerColor,
  buildInfoWindowContent,
} from "./map-utils";
import MapSidePanel from "./MapSidePanel";
import MobileBottomSheet from "./MobileBottomSheet";

export type { MapTransaction } from "./map-utils";

declare global {
  interface Window {
    kakao: any;
  }
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
      infoWindowRef.current.close();
    }

    const markers: any[] = [];

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

  return (
    <div className="flex h-[calc(100vh-64px)] w-full">
      <MapSidePanel
        transactions={filteredTransactions}
        activeId={activeId}
        filter={filter}
        setFilter={setFilter}
        panelOpen={panelOpen}
        setPanelOpen={setPanelOpen}
        onItemClick={handleItemClick}
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
