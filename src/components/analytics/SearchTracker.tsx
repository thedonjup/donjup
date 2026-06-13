"use client";

import { useEffect } from "react";
import { trackSearch } from "@/lib/analytics/events";
import { saveRecentSearch } from "@/lib/recent-searches";

interface SearchTrackerProps {
  query: string;
  resultCount: number;
  propertyType?: number;
}

/**
 * 검색 결과 페이지에서 GA4 search 이벤트를 전송하는 컴포넌트.
 * 서버 컴포넌트인 검색 페이지에 삽입하여 사용합니다.
 */
export default function SearchTracker({
  query,
  resultCount,
  propertyType = 1,
}: SearchTrackerProps) {
  useEffect(() => {
    if (query) {
      trackSearch(query, resultCount);
      saveRecentSearch(query, propertyType);
    }
  }, [query, propertyType, resultCount]);

  return null;
}
