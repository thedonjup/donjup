"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/providers/ThemeProvider";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/today", label: "오늘의 거래" },
  { href: "/new-highs", label: "오늘의 신고가" },
  { href: "/market", label: "지역별 시세" },
  { href: "/rent", label: "전월세" },
  { href: "/trend", label: "트렌드" },
  { href: "/themes", label: "테마 컬렉션" },
  { href: "/compare", label: "단지 비교" },
  { href: "/rate", label: "금리 현황" },
  { href: "/rate/calculator", label: "대출 계산기" },
  { href: "/daily/archive", label: "데일리 리포트" },
  { href: "/map", label: "지도" },
  { href: "/search", label: "검색" },
];

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-[var(--color-surface-elevated)] sm:hidden"
      aria-label="메뉴 열기"
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
      className="flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-[var(--color-surface-elevated)]"
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

  return (
    <>
      <HamburgerButton onClick={() => setOpen(true)} />

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-72 transform shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--color-surface-card, #ffffff)" }}
      >
        {/* Close button */}
        <div className="flex h-16 items-center justify-between px-5">
          <span className="text-lg font-extrabold text-[var(--color-text-primary)]">돈줍</span>
          <button
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-[var(--color-surface-elevated)]"
            aria-label="메뉴 닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l10 10M15 5l-10 10" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center rounded-xl px-4 py-3 text-[15px] font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Login / Profile */}
        <div className="px-3 py-2 border-t border-[var(--color-border)]">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center rounded-xl px-4 py-3 text-[15px] font-medium transition hover:bg-[var(--color-surface-elevated)]"
            style={{ color: "var(--color-text-primary)" }}
          >
            <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            로그인 / 프로필
          </Link>
        </div>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--color-border)] p-5">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            &copy; {new Date().getFullYear()} 돈줍(DonJup)
          </p>
        </div>
      </div>
    </>
  );
}
