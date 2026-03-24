"use client";

import { useEffect } from "react";
import { trackViewDetail } from "@/lib/analytics/events";

interface ViewDetailTrackerProps {
  contentType: string;
  contentId: string;
}

/**
 * 상세 페이지 조회 이벤트를 GA4에 전송하는 컴포넌트.
 */
export default function ViewDetailTracker({ contentType, contentId }: ViewDetailTrackerProps) {
  useEffect(() => {
    trackViewDetail(contentType, contentId);
  }, [contentType, contentId]);

  return null;
}
