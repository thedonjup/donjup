import { describe, expect, it } from "vitest";
import {
  parseFinanceRateType,
  parseRateHistoryMonths,
} from "@/lib/rate-history-query";

describe("rate history query", () => {
  it("parses bounded history month windows", () => {
    expect(parseRateHistoryMonths("24")).toBe(24);
    expect(parseRateHistoryMonths("500")).toBe(120);
    expect(parseRateHistoryMonths("0")).toBe(12);
    expect(parseRateHistoryMonths("bad")).toBe(12);
  });

  it("accepts known finance rate type shapes", () => {
    expect(parseFinanceRateType(" BASE_RATE ")).toBe("BASE_RATE");
    expect(parseFinanceRateType("CD_91")).toBe("CD_91");
    expect(parseFinanceRateType("BANK_KB")).toBe("BANK_KB");
  });

  it("rejects unsafe finance rate type values", () => {
    expect(parseFinanceRateType("BASE_RATE;DROP")).toBeNull();
    expect(parseFinanceRateType("BANK KB")).toBeNull();
    expect(parseFinanceRateType("A".repeat(65))).toBeNull();
    expect(parseFinanceRateType(null)).toBeNull();
  });
});
