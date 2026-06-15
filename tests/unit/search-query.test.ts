import { describe, expect, it } from "vitest";
import {
  normalizeSearchResultRow,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search-query-data";
import { searchRegionCode } from "@/lib/search-region-map";

describe("search query helpers", () => {
  it("normalizes database rows for search cards", () => {
    expect(normalizeSearchResultRow({
      id: "apt-1",
      apt_name: "Sample Apt",
      region_code: "11680",
      region_name: "Seoul Gangnam",
      dong_name: null,
      built_year: "2018",
      total_units: "1200",
      slug: "11680-1",
      govt_complex_id: "11680-1",
      latest_trade_price: "180000",
      latest_trade_date: "2026-04-29",
      latest_change_rate: "-4.2",
      latest_rent_deposit: "90000",
      latest_rent_monthly_rent: "0",
      latest_rent_date: "2026-04-30",
      latest_rent_type: "전세",
    })).toEqual({
      id: "apt-1",
      apt_name: "Sample Apt",
      region_code: "11680",
      region_name: "Seoul Gangnam",
      dong_name: null,
      sido_name: null,
      sigungu_name: null,
      built_year: 2018,
      total_units: 1200,
      slug: "11680-1",
      govt_complex_id: "11680-1",
      latest_trade_price: 180000,
      latest_trade_date: "2026-04-29",
      latest_change_rate: -4.2,
      latest_rent_deposit: 90000,
      latest_rent_monthly_rent: 0,
      latest_rent_date: "2026-04-30",
      latest_rent_type: "전세",
    });
  });

  it("keeps search result limits explicit", () => {
    expect(SEARCH_RESULT_LIMIT).toBe(50);
  });

  it("maps region aliases for shared search queries", () => {
    expect(searchRegionCode("seoul")).toBe("11");
    expect(searchRegionCode("SEOUL")).toBe("11");
    expect(searchRegionCode("\uAC15\uB0A8\uAD6C")).toBe("11680");
    expect(searchRegionCode("\uAC15\uB0A8")).toBe("11680");
    expect(searchRegionCode("unknown")).toBeNull();
  });
});
