import { describe, expect, it } from "vitest";
import {
  calcDropLevel,
  calculateSignalUpdates,
} from "../../scripts/local-data-pipeline.mjs";

describe("local data pipeline signal recalculation", () => {
  it("calculates running highest price and signal flags by region, complex, and size", () => {
    const updates = calculateSignalUpdates([
      {
        id: "tx-3",
        region_code: "11680",
        apt_name: "테스트",
        size_sqm: "84.9",
        trade_price: 90_000,
        trade_date: "2026-03-01",
      },
      {
        id: "tx-1",
        region_code: "11680",
        apt_name: "테스트",
        size_sqm: "84.9",
        trade_price: 100_000,
        trade_date: "2026-01-01",
      },
      {
        id: "tx-2",
        region_code: "11680",
        apt_name: "테스트",
        size_sqm: "84.9",
        trade_price: 120_000,
        trade_date: "2026-02-01",
      },
      {
        id: "tx-4",
        region_code: "11680",
        apt_name: "테스트",
        size_sqm: "59.9",
        trade_price: 80_000,
        trade_date: "2026-03-01",
      },
    ]);

    expect(updates).toEqual([
      {
        id: "tx-4",
        highest_price: 80_000,
        change_rate: null,
        is_new_high: false,
        is_significant_drop: false,
        drop_level: "normal",
      },
      {
        id: "tx-1",
        highest_price: 100_000,
        change_rate: null,
        is_new_high: false,
        is_significant_drop: false,
        drop_level: "normal",
      },
      {
        id: "tx-2",
        highest_price: 120_000,
        change_rate: null,
        is_new_high: true,
        is_significant_drop: false,
        drop_level: "normal",
      },
      {
        id: "tx-3",
        highest_price: 120_000,
        change_rate: -25,
        is_new_high: false,
        is_significant_drop: true,
        drop_level: "severe",
      },
    ]);
  });

  it("maps drop levels to the public signal thresholds", () => {
    expect(calcDropLevel(null)).toBe("normal");
    expect(calcDropLevel(-9.9)).toBe("normal");
    expect(calcDropLevel(-10)).toBe("decline");
    expect(calcDropLevel(-15)).toBe("crash");
    expect(calcDropLevel(-20)).toBe("severe");
  });
});
