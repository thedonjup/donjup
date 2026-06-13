"use client";

import { useEffect, useState } from "react";
import { subscribeBrowserToPush } from "@/lib/push-subscription";

export default function PushPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (localStorage.getItem("donjup-push-dismissed")) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) setVisible(true);
      })
      .catch(() => {});
  }, []);

  async function handleSubscribe() {
    const result = await subscribeBrowserToPush();
    if (result === "subscribed") {
      setVisible(false);
      return;
    }

    handleDismiss();
  }

  function handleDismiss() {
    localStorage.setItem("donjup-push-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-card)",
      }}
    >
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        매일 아침 부동산 폭락/신고가 알림을 받아보세요
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleSubscribe}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          알림 받기
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-2 py-1.5 text-xs transition hover:opacity-60"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
