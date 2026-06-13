"use client";

import { useSyncExternalStore } from "react";
import TrackedLink from "@/components/analytics/TrackedLink";
import {
  clearRecentSearches,
  getRecentSearches,
  RECENT_SEARCHES_EVENT,
} from "@/lib/recent-searches";
import { searchSuggestionHref } from "@/lib/search-landing";

interface RecentSearchesProps {
  currentPropertyType: number;
}

function subscribeRecentSearches(callback: () => void): () => void {
  window.addEventListener(RECENT_SEARCHES_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(RECENT_SEARCHES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerRecentSearchesSnapshot() {
  return [];
}

export default function RecentSearches({
  currentPropertyType,
}: RecentSearchesProps) {
  const items = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearches,
    getServerRecentSearchesSnapshot,
  );

  if (items.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold t-text-tertiary">최근 검색</span>
      {items.map((item) => (
        <TrackedLink
          key={`${item.query}-${item.propertyType}-${item.searchedAt}`}
          href={searchSuggestionHref(item.query, item.propertyType)}
          ctaName="search_recent_query_click"
          params={{
            query: item.query,
            property_type: item.propertyType,
          }}
          className="rounded-full border t-border bg-[var(--color-surface-card)] px-3 py-1.5 text-xs font-semibold t-text-secondary transition hover:bg-[var(--color-surface-elevated)]"
        >
          {item.query}
          {item.propertyType !== currentPropertyType && (
            <span className="ml-1 t-text-tertiary">#{item.propertyType}</span>
          )}
        </TrackedLink>
      ))}
      <button
        type="button"
        onClick={clearRecentSearches}
        className="rounded-full px-2 py-1 text-xs font-semibold t-text-tertiary transition hover:bg-[var(--color-surface-elevated)]"
      >
        지우기
      </button>
    </div>
  );
}
