"use client";

import { useEffect } from "react";
import { trackViewDetail, trackRetention } from "@/lib/analytics/events";
import { saveRecentComplex } from "@/lib/recent-complexes";

interface ViewDetailTrackerProps {
  contentType: string;
  contentId: string;
  aptName?: string;
  regionName?: string;
}

/**
 * 상세 페이지 조회 이벤트를 GA4에 전송하는 컴포넌트.
 */
export default function ViewDetailTracker({ contentType, contentId, aptName, regionName }: ViewDetailTrackerProps) {
  useEffect(() => {
    trackViewDetail(contentType, contentId);

    if (contentType === "apt" && aptName && regionName) {
      saveRecentComplex({
        govtComplexId: contentId,
        aptName,
        regionName,
      });
      trackRetention("recent_view_add", { content_id: contentId });
    }
  }, [contentType, contentId, aptName, regionName]);

  return null;
}
