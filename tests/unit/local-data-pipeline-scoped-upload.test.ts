import { describe, expect, it } from "vitest";
import {
  buildUploadScope,
  parseScopedMaxUpserts,
  requireScopedApply,
  scopedRows,
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
  });
});
