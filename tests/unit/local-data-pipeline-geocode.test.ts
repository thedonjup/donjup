import { describe, expect, it } from "vitest";
import {
  buildGeocodeQueries,
  isRateLimitedGeocodeStatus,
} from "../../scripts/local-data-pipeline.mjs";

describe("local data pipeline geocoding", () => {
  it("builds deduped Kakao search queries with regional context", () => {
    const queries = buildGeocodeQueries({
      address: "",
      region_name: "서울 강남구",
      dong_name: "대치동",
      apt_name: "은마(1차)",
    });

    expect(queries[0]).toMatchObject({
      strategy: "keyword_region_dong_apt",
      type: "keyword",
      query: "서울 강남구 대치동 은마 아파트",
    });
    expect(queries.some((query) => query.query === "")).toBe(false);
    expect(new Set(queries.map((query) => `${query.type}:${query.query}`)).size)
      .toBe(queries.length);
  });

  it("treats Kakao quota and throttling statuses as resumable stop signals", () => {
    expect(isRateLimitedGeocodeStatus(403)).toBe(true);
    expect(isRateLimitedGeocodeStatus(429)).toBe(true);
    expect(isRateLimitedGeocodeStatus(500)).toBe(false);
  });
});
