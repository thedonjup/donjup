"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/components/providers/ThemeProvider";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/today", label: "오늘의 거래" },
  { href: "/new-highs", label: "오늘의 신고가" },
  { href: "/market", label: "지역별 시세" },
  { href: "/rent", label: "전월세" },
  { href: "/trend", label: "트렌드" },
  { href: "/rate", label: "금리 현황" },
  { href: "/rate/calculator", label: "대출 계산기" },
  { href: "/themes", label: "테마 컬렉션" },
  { href: "/compare", label: "단지 비교" },
  { href: "/daily/archive", label: "데일리 리포트" },
  { href: "/map", label: "지도" },
  { href: "/search", label: "검색" },
];

export function HamburgerButton({ onClick, buttonRef }: { onClick: () => void; buttonRef?: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-secondary)" }}
      aria-label="메뉴 열기"
      aria-expanded={false}
      aria-haspopup="dialog"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 5h14M3 10h14M3 15h14" />
      </svg>
    </button>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-secondary)" }}
      aria-label={theme === "dark" ? "라이트 모드" : "다크 모드"}
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  // 메뉴 열 때 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      openButtonRef.current?.focus();
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape 키로 드로어 닫기
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const isDark = theme === "dark";
  const bg = isDark ? "#141b2d" : "#ffffff";
  const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";
  const borderColor = isDark ? "#1e293b" : "#e2e8f0";
  const hoverBg = isDark ? "#1e293b" : "#f1f5f9";

  return (
    <>
      <HamburgerButton onClick={() => setOpen(true)} buttonRef={openButtonRef} />

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9990,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="내비게이션 메뉴"
        style={{
          position: "fixed",
          top: 0,
          right: open ? 0 : "-288px",
          zIndex: 9991,
          height: "100vh",
          width: "288px",
          backgroundColor: bg,
          boxShadow: open ? "-10px 0 30px rgba(0,0,0,0.3)" : "none",
          transition: "right 0.3s ease-in-out",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", height: "64px", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <span style={{ fontSize: "18px", fontWeight: 800, color: textPrimary }}>돈줍</span>
          <button
            ref={closeButtonRef}
            onClick={() => setOpen(false)}
            style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: textSecondary }}
            aria-label="메뉴 닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l10 10M15 5l-10 10" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ padding: "8px 12px" }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: 500,
                color: textSecondary,
                textDecoration: "none",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = hoverBg; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Login / Profile */}
        <div style={{ padding: "8px 12px", borderTop: `1px solid ${borderColor}` }}>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 500,
              color: textPrimary,
              textDecoration: "none",
            }}
          >
            <svg style={{ marginRight: "12px" }} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            로그인 / 프로필
          </Link>
        </div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px", borderTop: `1px solid ${borderColor}` }}>
          <p style={{ fontSize: "12px", color: textSecondary }}>
            &copy; {new Date().getFullYear()} 돈줍(DonJup)
          </p>
        </div>
      </div>
    </>
  );
}
