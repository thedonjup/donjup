"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/providers/AuthProvider";

// brand: Google OAuth button uses official Google brand colors per Google branding guidelines
// These colors (#EA4335, #4285F4, #FBBC05, #34A853) must not be changed
const GOOGLE_SVG_FILL_RED = "#EA4335";
const GOOGLE_SVG_FILL_BLUE = "#4285F4";
const GOOGLE_SVG_FILL_YELLOW = "#FBBC05";
const GOOGLE_SVG_FILL_GREEN = "#34A853";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { signInWithGoogle } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoginError(null);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !mounted) return null;

  const handleGoogle = async () => {
    setLoginError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (e: any) {
      if (e?.code === "auth/popup-closed-by-user") return;
      setLoginError("로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        WebkitOverflowScrolling: "touch",
      }}
      onClick={onClose}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* 배경 오버레이 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* 모달 카드 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "384px",
          padding: "32px",
          borderRadius: "16px",
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5l-10 10" />
          </svg>
        </button>

        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", background: "var(--color-semantic-rise)", color: "white", fontWeight: 900, fontSize: "14px" }}>₩</div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-text-primary)" }}>돈줍</span>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text-primary)" }}>로그인</h2>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
            간편하게 로그인하고<br />관심 단지를 관리하세요.
          </p>
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={handleGoogle}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-card)",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill={GOOGLE_SVG_FILL_RED} d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill={GOOGLE_SVG_FILL_BLUE} d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill={GOOGLE_SVG_FILL_YELLOW} d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill={GOOGLE_SVG_FILL_GREEN} d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google로 시작하기
          </button>

          <button
            disabled
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "#FEE500", // brand: KakaoTalk brand color
              color: "#391B1B", // brand: KakaoTalk brand color
              fontSize: "14px",
              fontWeight: 500,
              opacity: 0.5,
              cursor: "not-allowed",
            }}
          >
            카카오로 시작하기
          </button>

          <button
            disabled
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "#03C75A", // brand: Naver green
              color: "var(--color-text-inverted)",
              fontSize: "14px",
              fontWeight: 500,
              opacity: 0.5,
              cursor: "not-allowed",
            }}
          >
            네이버로 시작하기
          </button>
        </div>

        {loginError && (
          <p style={{ marginTop: "12px", textAlign: "center", fontSize: "13px", color: "var(--color-semantic-drop)", fontWeight: 500 }}>
            {loginError}
          </p>
        )}
        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "12px", color: "var(--color-text-tertiary)" }}>
          카카오/네이버 로그인은 준비 중입니다.
        </p>

        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border-subtle)", textAlign: "center", fontSize: "12px", color: "var(--color-text-tertiary)" }}>
          로그인 시 <a href="/privacy" style={{ textDecoration: "underline" }}>개인정보처리방침</a> 및 이용약관에 동의하는 것으로 간주합니다.
        </div>
      </div>
    </div>,
    document.body,
  );
}
