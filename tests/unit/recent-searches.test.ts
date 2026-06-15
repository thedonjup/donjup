import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRecentSearches,
  MAX_RECENT_SEARCHES,
  mergeRecentSearches,
  RECENT_SEARCHES_KEY,
} from "@/lib/recent-searches";

function stubBrowserStorage(initialValue: string | null): void {
  let value = initialValue;
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
    removeItem: vi.fn(() => {
      value = null;
    }),
  });
  vi.stubGlobal("window", {
    localStorage: globalThis.localStorage,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

describe("recent searches", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds normalized queries and keeps the newest first", () => {
    expect(mergeRecentSearches([], "  강남   래미안  ", 1, 1000)).toEqual([
      { query: "강남 래미안", propertyType: 1, searchedAt: 1000 },
    ]);
  });

  it("deduplicates by query and property type", () => {
    const current = [
      { query: "강남 래미안", propertyType: 1, searchedAt: 1000 },
      { query: "강남 래미안", propertyType: 2, searchedAt: 900 },
    ];

    expect(mergeRecentSearches(current, "강남 래미안", 1, 2000)).toEqual([
      { query: "강남 래미안", propertyType: 1, searchedAt: 2000 },
      { query: "강남 래미안", propertyType: 2, searchedAt: 900 },
    ]);
  });

  it("caps the recent search list", () => {
    const current = Array.from({ length: MAX_RECENT_SEARCHES + 2 }, (_, index) => ({
      query: `검색${index}`,
      propertyType: 1,
      searchedAt: index,
    }));

    expect(mergeRecentSearches(current, "새 검색", 1, 999)).toHaveLength(MAX_RECENT_SEARCHES);
  });

  it("returns a stable snapshot when localStorage has not changed", () => {
    stubBrowserStorage(JSON.stringify([
      { query: "답십리 두산", propertyType: 1, searchedAt: 1000 },
    ]));

    const first = getRecentSearches();
    const second = getRecentSearches();

    expect(localStorage.getItem).toHaveBeenCalledWith(RECENT_SEARCHES_KEY);
    expect(second).toBe(first);
  });
});
