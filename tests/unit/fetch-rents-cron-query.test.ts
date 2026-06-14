import { describe, expect, it } from "vitest";
import {
  getRecentRentYearMonths,
  parseFetchRentsCronQuery,
} from "@/lib/fetch-rents-cron-query";

describe("fetch rents cron query", () => {
  it("parses full-run defaults", () => {
    const parsed = parseFetchRentsCronQuery(
      new URLSearchParams(),
      new Date("2026-05-01T12:00:00+09:00")
    );

    expect(parsed).toMatchObject({
      ok: true,
      query: {
        batch: null,
        isCronBatch: false,
        monthCount: 1,
        dealYearMonths: ["202605"],
      },
    });
    expect(parsed.ok && parsed.query.sidoCodes.length).toBeGreaterThan(0);
    expect(parsed.ok && parsed.query.regionEntries.length).toBeGreaterThan(0);
  });

  it("parses bounded batch and month count", () => {
    const parsed = parseFetchRentsCronQuery(
      new URLSearchParams({ batch: "2", months: "6" }),
      new Date("2026-01-01T00:30:00+09:00")
    );

    expect(parsed).toMatchObject({
      ok: true,
      query: {
        batch: 2,
        isCronBatch: true,
        monthCount: 6,
        sidoCodes: ["41"],
        dealYearMonths: ["202601", "202512", "202511", "202510", "202509", "202508"],
      },
    });
  });

  it("rejects bad batch values instead of expanding to a full run", () => {
    for (const batch of ["1abc", "999", "-1", ""]) {
      expect(parseFetchRentsCronQuery(new URLSearchParams({ batch }))).toEqual({
        ok: false,
        error: "Invalid batch parameter",
      });
    }
  });

  it("rejects invalid months and duplicate params", () => {
    expect(parseFetchRentsCronQuery(new URLSearchParams({ months: "7" }))).toEqual({
      ok: false,
      error: "Invalid months parameter",
    });
    expect(parseFetchRentsCronQuery(new URLSearchParams("batch=0&batch=1"))).toEqual({
      ok: false,
      error: "Duplicate batch parameter",
    });
  });

  it("keeps KST recent rent months in descending order", () => {
    expect(
      getRecentRentYearMonths(3, new Date("2026-01-01T00:30:00+09:00"))
    ).toEqual(["202601", "202512", "202511"]);
  });
});
