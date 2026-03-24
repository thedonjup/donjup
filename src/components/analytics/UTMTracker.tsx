"use client";

import { useEffect } from "react";
import { captureUtm, getStoredUtm } from "@/lib/analytics/utm";

/**
 * UTM 파라미터를 캡처하고, 페이지뷰에 UTM 데이터를 포함하여 전송하는 클라이언트 컴포넌트.
 * layout.tsx에 한 번 추가하면 모든 페이지에서 동작합니다.
 */
export default function UTMTracker() {
  useEffect(() => {
    // 1. UTM 캡처 (URL 파라미터 → localStorage)
    captureUtm();

    // 2. 페이지뷰에 UTM 데이터 포함하여 전송
    const utm = getStoredUtm();
    const pagePath = window.location.pathname;

    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pagePath,
        ...(utm?.utm_source && { utmSource: utm.utm_source }),
        ...(utm?.utm_medium && { utmMedium: utm.utm_medium }),
        ...(utm?.utm_campaign && { utmCampaign: utm.utm_campaign }),
      }),
    }).catch(() => {
      // 페이지뷰 전송 실패 무시
    });
  }, []);

  return null;
}
