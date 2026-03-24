"use client";

import { useEffect } from "react";
import { trackSearch } from "@/lib/analytics/events";

interface SearchTrackerProps {
  query: string;
  resultCount: number;
}

/**
 * 검색 결과 페이지에서 GA4 search 이벤트를 전송하는 컴포넌트.
 * 서버 컴포넌트인 검색 페이지에 삽입하여 사용합니다.
 */
export default function SearchTracker({ query, resultCount }: SearchTrackerProps) {
  useEffect(() => {
    if (query) {
      trackSearch(query, resultCount);
    }
  }, [query, resultCount]);

  return null;
}
