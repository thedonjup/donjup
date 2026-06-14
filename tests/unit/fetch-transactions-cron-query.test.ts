import { describe, expect, it } from "vitest";
import {
  getRecentDealYearMonths,
  parseFetchTransactionsCronQuery,
} from "@/lib/fetch-transactions-cron-query";
import { PROPERTY_TYPES } from "@/lib/constants/property-types";

describe("fetch transactions cron query", () => {
  it("parses full-run defaults", () => {
    const parsed = parseFetchTransactionsCronQuery(
      new URLSearchParams(),
      new Date("2026-05-01T12:00:00+09:00")
    );

    expect(parsed).toMatchObject({
      ok: true,
      query: {
        batch: null,
        isCronBatch: false,
        propertyType: PROPERTY_TYPES.APT,
        monthCount: 1,
        dealYearMonths: ["202605"],
      },
    });
    expect(parsed.ok && parsed.query.sidoCodes.length).toBeGreaterThan(1);
    expect(parsed.ok && parsed.query.regionEntries.length).toBeGreaterThan(0);
  });

  it("parses bounded batch, property type, and month count", () => {
    const parsed = parseFetchTransactionsCronQuery(
      new URLSearchParams({ batch: "2", type: "3", months: "6" }),
      new Date("2026-01-01T00:30:00+09:00")
    );

    expect(parsed).toMatchObject({
      ok: true,
      query: {
        batch: 2,
        isCronBatch: true,
        propertyType: PROPERTY_TYPES.OFFICETEL,
        monthCount: 6,
        sidoCodes: ["41"],
        dealYearMonths: ["202601", "202512", "202511", "202510", "202509", "202508"],
      },
    });
  });

  it("rejects bad batch values instead of expanding to a full run", () => {
    for (const batch of ["1abc", "999", "-1", ""]) {
      expect(parseFetchTransactionsCronQuery(new URLSearchParams({ batch }))).toEqual({
        ok: false,
        error: "Invalid batch parameter",
      });
    }
  });

  it("rejects invalid type, months, and duplicate params", () => {
    expect(parseFetchTransactionsCronQuery(new URLSearchParams({ type: "abc" }))).toEqual({
      ok: false,
      error: "Invalid property type parameter",
    });
    expect(parseFetchTransactionsCronQuery(new URLSearchParams({ months: "7" }))).toEqual({
      ok: false,
      error: "Invalid months parameter",
    });
    expect(parseFetchTransactionsCronQuery(new URLSearchParams("batch=0&batch=1"))).toEqual({
      ok: false,
      error: "Duplicate batch parameter",
    });
  });

  it("keeps KST recent deal months in descending order", () => {
    expect(
      getRecentDealYearMonths(3, new Date("2026-01-01T00:30:00+09:00"))
    ).toEqual(["202601", "202512", "202511"]);
  });
});
