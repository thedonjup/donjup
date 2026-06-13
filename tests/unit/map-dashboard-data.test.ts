import { describe, expect, it } from "vitest";
import {
  normalizeMapTransactionRow,
  normalizeMapTransactionRows,
} from "@/lib/map-dashboard-data";

const baseRow = {
  id: "tx-1",
  complex_id: "complex-1",
  govt_complex_id: "11230-164",
  apt_name: "Sample Apt",
  region_code: "11230",
  trade_price: 100000,
  change_rate: "-12.5",
  is_new_high: false,
  size_sqm: "84.9",
  trade_date: "2026-04-29",
  complex_slug: "11230-164",
  dong_name: "Sample Dong",
  latitude: "37.5",
  longitude: "127.1",
};

describe("map dashboard data helpers", () => {
  it("normalizes map rows and builds canonical detail URLs", () => {
    expect(normalizeMapTransactionRow(baseRow)).toMatchObject({
      trade_price: 100000,
      change_rate: -12.5,
      size_sqm: 84.9,
      latitude: 37.5,
      longitude: 127.1,
      detail_url: "/apt/11230-164",
    });
  });

  it("drops rows without complete coordinates", () => {
    expect(normalizeMapTransactionRow({ ...baseRow, longitude: null })).toBeNull();
    expect(normalizeMapTransactionRows([baseRow, { ...baseRow, id: "tx-2", latitude: null }]))
      .toHaveLength(1);
  });
});
