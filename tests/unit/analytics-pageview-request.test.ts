import { describe, expect, it } from "vitest";
import {
  inferPageType,
  parsePageviewRequest,
} from "@/lib/analytics-pageview-request";

describe("analytics pageview request", () => {
  it("normalizes paths and infers page type", () => {
    expect(parsePageviewRequest({ pagePath: " /apt/seoul/raemian?utm=x " })).toEqual({
      ok: true,
      pagePath: "/apt/seoul/raemian",
      pageType: "apt_detail",
    });
  });

  it("uses a valid explicit page type", () => {
    expect(parsePageviewRequest({ pagePath: "/daily/archive", pageType: "archive" })).toEqual({
      ok: true,
      pagePath: "/daily/archive",
      pageType: "archive",
    });
  });

  it("rejects unsafe or overlong paths", () => {
    expect(parsePageviewRequest({ pagePath: "https://donjup.com/" }).ok).toBe(false);
    expect(parsePageviewRequest({ pagePath: "//evil.test/path" }).ok).toBe(false);
    expect(parsePageviewRequest({ pagePath: `/${"a".repeat(301)}` }).ok).toBe(false);
  });

  it("classifies known sections", () => {
    expect(inferPageType("/")).toBe("home");
    expect(inferPageType("/rate/calculator")).toBe("rate");
    expect(inferPageType("/new-highs")).toBe("new_highs");
    expect(inferPageType("/unknown")).toBe("other");
  });
});
