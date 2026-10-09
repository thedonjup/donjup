import { describe, expect, it } from "vitest";
import { filtersFromOptions } from "../../scripts/reconcile-local-db-alignment.mjs";

const scope = { items: [{ dealYearMonth: "202604", regionCode: "11110" }] };
describe("local/DB alignment scope", () => {
  it("compares both complete datasets when no scope is requested", () => {
    expect(filtersFromOptions({}, scope)).toEqual({ months: null, regions: null });
  });
  it("uses manifest boundaries only for an explicitly scoped review", () => {
    const result = filtersFromOptions({ status: "fetched" }, scope);
    expect([...result.months!]).toEqual(["202604"]);
    expect([...result.regions!]).toEqual(["11110"]);
  });
});
