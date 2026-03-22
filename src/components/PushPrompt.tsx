"use client";

import { useEffect, useState } from "react";

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
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      setVisible(false);
    } catch {
      // 사용자가 알림 권한 거부
      handleDismiss();
    }
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}
