import { describe, expect, it } from "vitest";
import {
  buildUploadScope,
  parseScopedMaxUpserts,
  requireScopedApply,
  scopedRows,
  validateMolitPage,
  isExtendedItemComplete,
} from "../../scripts/local-data-pipeline.mjs";

describe("local data pipeline scoped upload guards", () => {
  it("rejects apply when run id and month scope are missing", () => {
    expect(() => requireScopedApply({ apply: "true" }))
      .toThrow(/Scoped upload required/);
    expect(() => requireScopedApply({
      apply: "true",
      "run-id": "extended-period-test",
    })).toThrow(/Scoped upload required/);
    expect(() => requireScopedApply({
      apply: "true",
      "run-id": "extended-period-test",
      ym: "202604",
      regions: "11110",
      kind: "sale",
      "review-checksum": "reviewed",
      "backup-artifact": "verified.json",
    })).not.toThrow();
  });

  it("filters candidates by run id and target month", () => {
    const scope = buildUploadScope({
      "run-id": "extended-period-test",
      ym: "202604",
    });
    const rows = [
      { id: "in-scope", collectionRunId: "extended-period-test", dealYearMonth: "202604" },
      { id: "wrong-month", collectionRunId: "extended-period-test", dealYearMonth: "202605" },
      { id: "wrong-run", collectionRunId: "other-run", dealYearMonth: "202604" },
    ];

    const result = scopedRows(rows, (row) => row.id, scope);

    expect(result.sourceRows.map((row) => row.id)).toEqual([
      "in-scope",
      "wrong-month",
    ]);
    expect(result.candidateRows.map((row) => row.id)).toEqual(["in-scope"]);
    expect(result.outOfScopeRows.map((row) => row.id)).toEqual(["wrong-month"]);
  });

  it("keeps zero max upserts as an apply kill switch", () => {
    expect(parseScopedMaxUpserts("0")).toBe(0);
    expect(parseScopedMaxUpserts("25")).toBe(25);
    expect(parseScopedMaxUpserts(undefined)).toBe(1000);
    expect(parseScopedMaxUpserts("100000")).toBe(1000);
  });

  it("does not lose an earlier run when another run has the same transaction", () => {
    const scope = buildUploadScope({ "run-id": "first", ym: "202604" });
    const result = scopedRows([
      { id: "same", collectionRunId: "first", dealYearMonth: "202604", tradeDate: "2026-04-03" },
      { id: "same", collectionRunId: "later", dealYearMonth: "202604", tradeDate: "2026-04-03" },
      { id: "bad-date", collectionRunId: "first", dealYearMonth: "202604", tradeDate: "2026-05-03" },
    ], (row) => row.id, scope);
    expect(result.candidateRows.map((row) => row.id)).toEqual(["same"]);
    expect(result.outOfScopeRows.map((row) => row.id)).toEqual(["bad-date"]);
  });

  it("rejects error envelopes and malformed empty success responses", () => {
    expect(() => validateMolitPage("<error>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</error>", "sale", "11110", "202610"))
      .toThrow(/resultCode/);
    expect(() => validateMolitPage("<resultCode>000</resultCode>", "sale", "11110", "202610"))
      .toThrow(/totalCount/);
    expect(validateMolitPage("<resultCode>000</resultCode><totalCount>0</totalCount>", "sale", "11110", "202610"))
      .toEqual({ rows: [], totalCount: 0 });
  });

  it("refreshes recent coverage instead of treating it as permanently complete", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    expect(isExtendedItemComplete({ status: "fetched", fetchedAt: "2026-10-08T00:00:00Z" }, "202610", now)).toBe(false);
    expect(isExtendedItemComplete({ status: "fetched", fetchedAt: "2026-10-09T23:00:00Z" }, "202610", now)).toBe(true);
    expect(isExtendedItemComplete({ status: "failed_final" }, "202604", now)).toBe(false);
  });
});
