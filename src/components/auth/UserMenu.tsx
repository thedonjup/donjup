"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import LoginModal from "./LoginModal";

export default function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  if (loading) {
    return (
      <div
        className="h-8 w-8 animate-pulse rounded-full"
        style={{ background: "var(--color-surface-elevated)" }}
      />
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <button
          onClick={() => setLoginOpen(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-brand-600 transition hover:bg-brand-700"
        >
          로그인
        </button>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    );
  }

  // Logged in
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-[var(--color-surface-elevated)]"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {(user.displayName ?? user.email ?? "U")[0]}
          </div>
        )}
        <span
          className="hidden text-sm font-medium sm:inline"
          style={{ color: "var(--color-text-primary)" }}
        >
          {user.displayName ?? "사용자"}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="hidden sm:block"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-lg"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <div
            className="border-b px-4 py-3"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {user.displayName ?? "사용자"}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {user.email}
            </p>
          </div>
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm transition hover:bg-[var(--color-surface-elevated)]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              프로필
            </Link>
            <button
              onClick={async () => {
                await signOut();
                setDropdownOpen(false);
              }}
              className="flex w-full items-center px-4 py-2 text-sm transition hover:bg-[var(--color-surface-elevated)]"
              style={{ color: "var(--color-text-secondary)" }}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
