import { beforeEach, describe, expect, it } from "vitest";
import {
  PAGEVIEW_DEDUPE_WINDOW_MS,
  pageviewClientFingerprint,
  resetPageviewDedupeForTests,
  shouldRecordPageview,
} from "@/lib/analytics-pageview-dedupe";

describe("analytics pageview dedupe", () => {
  beforeEach(() => {
    resetPageviewDedupeForTests();
  });

  it("builds a stable client fingerprint from proxy headers and user agent", () => {
    const headers = new Headers({
      "user-agent": "Test Browser",
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });

    expect(pageviewClientFingerprint(headers)).toBe("203.0.113.10|Test Browser");
  });

  it("suppresses duplicate pageviews inside the cost-control dedupe window", () => {
    const input = {
      clientFingerprint: "203.0.113.10|Test Browser",
      pagePath: "/apt/123",
      now: 1000,
    };

    expect(shouldRecordPageview(input)).toBe(true);
    expect(shouldRecordPageview({ ...input, now: 2000 })).toBe(false);
    expect(shouldRecordPageview({ ...input, pagePath: "/search", now: 2000 })).toBe(true);
    expect(shouldRecordPageview({ ...input, now: 1_000 + PAGEVIEW_DEDUPE_WINDOW_MS })).toBe(true);
  });
});
