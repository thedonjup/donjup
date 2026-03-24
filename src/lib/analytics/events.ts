declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * GA4 커스텀 이벤트 전송 유틸리티
 * gtag가 로드되지 않은 환경에서는 조용히 무시됨
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  if (typeof window === "undefined" || !window.gtag) return;

  try {
    window.gtag("event", eventName, params);
  } catch {
    // gtag 호출 실패 시 무시
  }
}

/* ─── 사전 정의된 이벤트 헬퍼 ─── */

/** 검색 이벤트 */
export function trackSearch(query: string, resultCount?: number) {
  trackEvent("search", {
    search_term: query,
    ...(resultCount !== undefined && { results_count: resultCount }),
  });
}

/** 공유 이벤트 */
export function trackShare(method: string, contentId?: string) {
  trackEvent("share", {
    method,
    ...(contentId && { content_id: contentId }),
  });
}

/** 계산기 사용 이벤트 */
export function trackCalculate(calculatorType: string, params?: Record<string, string | number>) {
  trackEvent("calculate", {
    calculator_type: calculatorType,
    ...params,
  });
}

/** 상세 조회 이벤트 */
export function trackViewDetail(contentType: string, contentId: string) {
  trackEvent("view_detail", {
    content_type: contentType,
    content_id: contentId,
  });
}
