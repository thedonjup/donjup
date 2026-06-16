import { describe, expect, it } from "vitest";
import {
  buildRentReconcilePlan,
  complexRows,
  rentTransactionId,
} from "../../scripts/local-data-pipeline.mjs";

function rentRow(overrides = {}) {
  return {
    regionCode: "11110",
    regionName: "서울 종로구",
    dongName: "효제동",
    aptName: "테스트",
    sizeSqm: 84.9,
    floor: 7,
    deposit: 50_000,
    monthlyRent: 0,
    rentType: "전세",
    contractType: "신규",
    tradeDate: "2026-05-01",
    preDeposit: null,
    preMonthlyRent: null,
    rawData: {},
    ...overrides,
  };
}

describe("local data pipeline rent reconcile", () => {
  it("detects local rent rows missing from the database by full transaction id", () => {
    const existing = rentRow({ aptName: "기존" });
    const missing = rentRow({ aptName: "누락" });
    const plan = buildRentReconcilePlan(
      [existing, missing, missing],
      [{
        id: rentTransactionId(existing),
        apt_name: existing.aptName,
        size_sqm: String(existing.sizeSqm),
        floor: existing.floor,
        trade_date: existing.tradeDate,
        deposit: existing.deposit,
        monthly_rent: existing.monthlyRent,
      }]
    );

    expect(plan.localRows).toBe(3);
    expect(plan.localUniqueRows).toBe(2);
    expect(plan.dbRows).toBe(1);
    expect(plan.missing).toHaveLength(1);
    expect(plan.missing[0]?.row.aptName).toBe("누락");
    expect(plan.missingNoCurrentUniqueConflict).toBe(1);
  });

  it("flags missing rows that would be blocked by the current DB unique key", () => {
    const local = rentRow({ contractType: "갱신", preDeposit: 49_000 });
    const plan = buildRentReconcilePlan(
      [local],
      [{
        id: "different-full-id",
        apt_name: local.aptName,
        size_sqm: String(local.sizeSqm),
        floor: local.floor,
        trade_date: local.tradeDate,
        deposit: local.deposit,
        monthly_rent: local.monthlyRent,
      }]
    );

    expect(plan.missing).toHaveLength(1);
    expect(plan.missingBlockedByCurrentUnique).toBe(1);
  });

  it("promotes rent-only apartments to searchable complex rows without duplicating sale complexes", () => {
    const sale = {
      regionCode: "11230",
      regionName: "서울 동대문구",
      dongName: "답십리동",
      aptName: "두산위브",
      aptSeq: "11230-2036",
      builtYear: 2007,
    };
    const rentOnly = rentRow({
      regionCode: "11230",
      regionName: "서울 동대문구",
      dongName: "답십리동",
      aptName: "두산",
      builtYear: 2000,
    });
    const rentDuplicate = rentRow({
      regionCode: "11230",
      regionName: "서울 동대문구",
      dongName: "답십리동",
      aptName: "두산위브",
      builtYear: 2007,
    });

    expect(complexRows([sale], [rentOnly, rentDuplicate])).toEqual([
      expect.objectContaining({
        slug: "11230-2036",
        apt_name: "두산위브",
        govt_complex_id: "11230-2036",
        identity_id: "molit-11230-2036",
      }),
      expect.objectContaining({
        slug: "11230-답십리동-두산",
        apt_name: "두산",
        dong_name: "답십리동",
        built_year: 2000,
        govt_complex_id: null,
        identity_id: "natural-11230-답십리동-두산-2000-1",
      }),
    ]);
  });
});
