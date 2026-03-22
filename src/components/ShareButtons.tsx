"use client";

import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = (source: string) =>
    `${url}${url.includes("?") ? "&" : "?"}utm_source=${source}&utm_medium=share`;

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text: description, url: fullUrl("native") });
    } catch {
      // 사용자가 취소한 경우 무시
    }
  }

  function handleTwitter() {
    const text = encodeURIComponent(`${title}\n${description ?? ""}`);
    const link = encodeURIComponent(fullUrl("twitter"));
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${link}`, "_blank");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl("copy"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="flex items-center gap-2">
      {canNativeShare && (
        <button
          onClick={handleNativeShare}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
            background: "var(--color-surface-card)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          공유
        </button>
      )}

      <button
        onClick={handleTwitter}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text-secondary)",
          background: "var(--color-surface-card)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </button>

      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
        style={{
          borderColor: copied ? "var(--color-semantic-rise)" : "var(--color-border)",
          color: copied ? "var(--color-semantic-rise)" : "var(--color-text-secondary)",
          background: "var(--color-surface-card)",
        }}
      >
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            복사됨
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            링크 복사
          </>
        )}
      </button>
    </div>
  );
}
