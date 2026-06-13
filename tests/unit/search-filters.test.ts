import { describe, expect, it } from "vitest";
import {
  filterInputValue,
  hasSearchFilters,
  normalizeSearchQuery,
  parsePropertyType,
  parseSearchFilters,
  toSearchLikePattern,
} from "@/lib/search-filters";

describe("search filters", () => {
  it("normalizes search query whitespace and length", () => {
    const longQuery = `  강남   래미안  ${"가".repeat(100)}`;

    expect(normalizeSearchQuery(longQuery)).toHaveLength(80);
    expect(normalizeSearchQuery("  강남   래미안  ")).toBe("강남 래미안");
  });

  it("parses valid page search filters", () => {
    const filters = parseSearchFilters({
      priceMin: "30000",
      priceMax: "60000",
      sizeMin: "84",
      sizeMax: "84.99",
      builtYearMin: "2010",
    });

    expect(filters).toEqual({
      priceMin: 30000,
      priceMax: 60000,
      sizeMin: 84,
      sizeMax: 84.99,
      builtYearMin: 2010,
    });
    expect(hasSearchFilters(filters)).toBe(true);
  });

  it("orders reversed range filters", () => {
    const filters = parseSearchFilters({
      priceMin: "90000",
      priceMax: "30000",
      sizeMin: "135",
      sizeMax: "84",
    });

    expect(filters.priceMin).toBe(30000);
    expect(filters.priceMax).toBe(90000);
    expect(filters.sizeMin).toBe(84);
    expect(filters.sizeMax).toBe(135);
  });

  it("rejects invalid or unsafe filter values", () => {
    const filters = parseSearchFilters({
      priceMin: "-1",
      priceMax: "10000001",
      sizeMin: "wide",
      sizeMax: "1001",
      builtYearMin: "1959",
    });

    expect(filters).toEqual({
      priceMin: null,
      priceMax: null,
      sizeMin: null,
      sizeMax: null,
      builtYearMin: null,
    });
    expect(hasSearchFilters(filters)).toBe(false);
  });

  it("uses URLSearchParams and the first array value", () => {
    const urlParams = new URLSearchParams({
      priceMin: "100000",
      sizeMin: "135",
    });

    expect(parseSearchFilters(urlParams).priceMin).toBe(100000);
    expect(parseSearchFilters({ priceMin: ["30000", "60000"] }).priceMin).toBe(30000);
  });

  it("parses property type and input display values", () => {
    expect(parsePropertyType("2")).toBe(2);
    expect(parsePropertyType("9")).toBe(1);
    expect(parsePropertyType(["3"])).toBe(3);
    expect(filterInputValue(null)).toBe("");
    expect(filterInputValue(84.99)).toBe("84.99");
  });

  it("escapes SQL LIKE wildcards in user search terms", () => {
    expect(toSearchLikePattern("100%_apt\\name")).toBe("%100\\%\\_apt\\\\name%");
  });
});
