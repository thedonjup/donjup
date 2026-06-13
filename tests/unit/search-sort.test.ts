import { describe, expect, it } from "vitest";
import {
  parseSearchSort,
  SEARCH_SORT_OPTIONS,
} from "@/lib/search-sort";

describe("search sort", () => {
  it("parses supported search sort keys", () => {
    expect(parseSearchSort("recent")).toBe("recent");
    expect(parseSearchSort("biggest-drop")).toBe("biggest-drop");
    expect(parseSearchSort("highest-price")).toBe("highest-price");
  });

  it("falls back to relevance for missing or invalid sort values", () => {
    expect(parseSearchSort(undefined)).toBe("relevance");
    expect(parseSearchSort("unknown")).toBe("relevance");
    expect(parseSearchSort(["recent", "highest-price"])).toBe("recent");
  });

  it("keeps sort options ordered for the search page control", () => {
    expect(SEARCH_SORT_OPTIONS.map((option) => option.value)).toEqual([
      "relevance",
      "recent",
      "biggest-drop",
      "highest-price",
    ]);
  });
});
