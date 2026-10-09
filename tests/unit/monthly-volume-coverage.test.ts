import { describe, expect, it } from "vitest";
import { monthOverMonthChangeRate } from "@/lib/market-trend-landing";

describe("monthly volume completeness", () => {
  it("does not interpret partial ingestion as a market collapse", () => {
    const rows = [{ month: "2026-06", count: 20000 }, { month: "2026-07", count: 41 }];
    expect(monthOverMonthChangeRate(rows, false)).toBeNull();
    expect(monthOverMonthChangeRate(rows, true)).toBe(-99.8);
  });
});
