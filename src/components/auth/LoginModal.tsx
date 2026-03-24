"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const { signInWithGoogle } = useAuth();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch {
      // user cancelled or error — silently ignore
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="로그인"
      >
        <div
          className="relative w-full max-w-sm rounded-2xl p-8"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-[var(--color-surface-elevated)]"
            aria-label="닫기"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5l-10 10" />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
                ₩
              </div>
              <span className="text-lg font-extrabold t-text">돈줍</span>
            </div>
            <h2 className="text-xl font-bold t-text">로그인</h2>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              간편하게 로그인하고
              <br />
              관심 단지를 관리하세요.
            </p>
          </div>

          {/* Login buttons */}
          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition hover:shadow-md"
              style={{
                background: "white",
                borderColor: "#dadce0",
                color: "#333",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Google로 시작하기
            </button>

            {/* Kakao — disabled */}
            <button
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium opacity-50"
              style={{ background: "#FEE500", color: "#391B1B" }}
            >
              카카오로 시작하기
            </button>

            {/* Naver — disabled */}
            <button
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium opacity-50"
              style={{ background: "#03C75A", color: "white" }}
            >
              네이버로 시작하기
            </button>
          </div>

          <p
            className="mt-4 text-center text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            카카오/네이버 로그인은 준비 중입니다.
          </p>

          <div
            className="mt-4 border-t pt-4 text-center text-xs"
            style={{
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-tertiary)",
            }}
          >
            로그인 시{" "}
            <a href="/privacy" className="underline">
              개인정보처리방침
            </a>{" "}
            및 이용약관에 동의하는 것으로 간주합니다.
          </div>
        </div>
      </div>
    </>
  );
}
