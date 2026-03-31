"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { isAdmin } from "@/lib/admin/auth";
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
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "var(--color-surface-elevated, #e2e8f0)",
        }}
      />
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLoginOpen(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLoginOpen(true);
          }}
          style={{
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            border: "none",
            background: "var(--color-semantic-rise)",
            color: "var(--color-text-inverted)",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
          aria-label="로그인"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    );
  }

  // Logged in
  const admin = isAdmin(user.email ?? null);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 8px",
          borderRadius: "8px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            style={{ width: "28px", height: "28px", borderRadius: "50%" }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--color-semantic-rise)",
              color: "var(--color-text-inverted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {(user.displayName ?? user.email ?? "U")[0]}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: "8px",
            width: "192px",
            borderRadius: "12px",
            border: "1px solid var(--color-border, #e2e8f0)",
            background: "var(--color-surface-card, #ffffff)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
            zIndex: 9000,
            overflow: "hidden",
          }}
        >
          {/* User info */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border-subtle, #f1f5f9)",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--color-text-primary, #0f172a)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.displayName ?? "사용자"}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-tertiary, #94a3b8)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </p>
          </div>

          {/* Menu items */}
          <div style={{ padding: "4px 0" }}>
            {admin && (
              <Link
                href="/dam"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  color: "var(--color-semantic-rise)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                관리자
              </Link>
            )}
            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                fontSize: "14px",
                color: "var(--color-text-secondary, #475569)",
                textDecoration: "none",
              }}
            >
              프로필
            </Link>
            <button
              onClick={async () => {
                await signOut();
                setDropdownOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "8px 16px",
                fontSize: "14px",
                color: "var(--color-text-secondary, #475569)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
