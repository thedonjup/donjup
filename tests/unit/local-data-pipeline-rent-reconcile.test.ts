import { describe, expect, it } from "vitest";
import {
  buildRentReconcilePlan,
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
});
