"use client";

import { useState } from "react";
import {
  hasAptAlert,
  parseAptAlerts,
  removeAptAlert,
  upsertAptAlert,
} from "@/lib/apt-alerts";
import { trackRetention } from "@/lib/analytics/events";
import { subscribeBrowserToPush, type PushSubscribeResult } from "@/lib/push-subscription";

const STORAGE_KEY = "donjup-apt-alerts";

function getStoredAlerts() {
  if (typeof window === "undefined") return [];
  return parseAptAlerts(localStorage.getItem(STORAGE_KEY));
}

function setStoredAlerts(alerts: ReturnType<typeof getStoredAlerts>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // localStorage unavailable
  }
}

function statusLabel(status: PushSubscribeResult | "idle" | "saving"): string {
  switch (status) {
    case "subscribed":
      return "브라우저 알림까지 등록됐습니다";
    case "unsupported":
      return "브라우저 알림은 미지원이라 관심 알림만 저장됐습니다";
    case "permission-denied":
      return "알림 권한이 꺼져 있어 관심 알림만 저장됐습니다";
    case "missing-key":
      return "푸시 키가 없어 관심 알림만 저장됐습니다";
    case "server-error":
      return "푸시 저장에 실패해 관심 알림만 저장됐습니다";
    case "saving":
      return "알림을 등록하는 중입니다";
    default:
      return "가격 변동을 놓치지 않도록 등록합니다";
  }
}

export default function NotifyButton({
  aptName,
  contentId,
  latestPrice,
}: {
  aptName: string;
  contentId: string;
  latestPrice?: number;
}) {
  const [isEnabled, setIsEnabled] = useState(() =>
    hasAptAlert(getStoredAlerts(), contentId)
  );
  const [status, setStatus] = useState<PushSubscribeResult | "idle" | "saving">("idle");

  async function handleClick() {
    const currentAlerts = getStoredAlerts();

    if (hasAptAlert(currentAlerts, contentId)) {
      setStoredAlerts(removeAptAlert(currentAlerts, contentId));
      setIsEnabled(false);
      setStatus("idle");
      trackRetention("apt_alert_remove", { content_id: contentId });
      return;
    }

    setStatus("saving");
    const nextAlerts = upsertAptAlert(currentAlerts, {
      contentId,
      aptName,
      latestPrice,
    });
    setStoredAlerts(nextAlerts);
    setIsEnabled(true);
    trackRetention("apt_alert_add", { content_id: contentId });

    const result = await subscribeBrowserToPush();
    setStatus(result);
  }

  return (
    <button
      onClick={handleClick}
      aria-pressed={isEnabled}
      title={statusLabel(status)}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
      style={{
        borderColor: isEnabled ? "var(--color-semantic-rise)" : "var(--color-border)",
        color: isEnabled ? "var(--color-semantic-rise)" : "var(--color-text-secondary)",
        background: "var(--color-surface-card)",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {status === "saving" ? "등록 중" : isEnabled ? "알림 등록됨" : "가격 알림"}
    </button>
  );
}
