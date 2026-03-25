"use client";

import { useEffect, useState } from "react";

const SIDO_LIST: { code: string; name: string }[] = [
  { code: "11", name: "서울" },
  { code: "26", name: "부산" },
  { code: "27", name: "대구" },
  { code: "28", name: "인천" },
  { code: "29", name: "광주" },
  { code: "30", name: "대전" },
  { code: "31", name: "울산" },
  { code: "36", name: "세종" },
  { code: "41", name: "경기" },
  { code: "42", name: "강원" },
  { code: "43", name: "충북" },
  { code: "44", name: "충남" },
  { code: "45", name: "전북" },
  { code: "46", name: "전남" },
  { code: "47", name: "경북" },
  { code: "48", name: "경남" },
  { code: "50", name: "제주" },
];

const STORAGE_KEY = "donjup-regions";
const DISMISSED_KEY = "donjup-regions-dismissed";

export default function RegionSelector() {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 이미 저장된 지역이 있거나 다시 보지 않기를 선택한 경우
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    // 약간의 딜레이 후 표시
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  function toggleRegion(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleSave() {
    try {
      if (selected.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      }
    } catch { /* quota exceeded */ }
    setVisible(false);
  }

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* quota exceeded */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99,
          backgroundColor: "rgba(0,0,0,0.5)",
          transition: "opacity 0.3s",
        }}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "var(--color-surface-card, #fff)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          maxHeight: "80vh",
          overflowY: "auto",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "var(--color-border, #e5e7eb)",
            }}
          />
        </div>

        <div style={{ padding: "20px 24px 32px" }}>
          {/* Title */}
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--color-text-primary, #111)",
              margin: 0,
            }}
          >
            관심 지역을 선택하세요
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary, #666)",
              marginTop: 6,
            }}
          >
            선택한 지역의 거래 정보를 우선 표시합니다 (복수 선택 가능)
          </p>

          {/* Region Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginTop: 20,
            }}
          >
            {SIDO_LIST.map((sido) => {
              const isSelected = selected.includes(sido.code);
              return (
                <button
                  key={sido.code}
                  onClick={() => toggleRegion(sido.code)}
                  style={{
                    padding: "10px 4px",
                    borderRadius: 10,
                    border: isSelected
                      ? "2px solid var(--color-brand-600, #2563eb)"
                      : "2px solid var(--color-border, #e5e7eb)",
                    backgroundColor: isSelected
                      ? "var(--color-brand-50, rgba(37,99,235,0.08))"
                      : "transparent",
                    color: isSelected
                      ? "var(--color-brand-600, #2563eb)"
                      : "var(--color-text-primary, #111)",
                    fontSize: 14,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {sido.name}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 24,
            }}
          >
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                backgroundColor: selected.length > 0
                  ? "var(--color-brand-600, #2563eb)"
                  : "var(--color-border, #d1d5db)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: selected.length > 0 ? "pointer" : "default",
                transition: "background-color 0.2s",
              }}
            >
              {selected.length > 0
                ? `${selected.length}개 지역 선택 완료`
                : "선택하고 시작하기"}
            </button>
          </div>

          <button
            onClick={handleDismiss}
            style={{
              display: "block",
              width: "100%",
              marginTop: 12,
              padding: "8px 0",
              border: "none",
              background: "transparent",
              color: "var(--color-text-tertiary, #999)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            다시 보지 않기
          </button>
        </div>

        {/* Slide-up animation */}
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}
