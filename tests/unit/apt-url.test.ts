import { describe, expect, it } from "vitest";
import {
  aptUrl,
  makeSlug,
  shouldRedirectToAptCanonical,
  toDbSlug,
  toUrlSlug,
} from "@/lib/apt-url";

describe("apt url helpers", () => {
  it("prefers govtComplexId for canonical apartment URLs", () => {
    expect(aptUrl({
      govtComplexId: "11230-164",
      regionCode: "11230",
      slug: "11230-legacy",
    })).toBe("/apt/11230-164");
  });

  it("falls back to shortened region slug URLs", () => {
    expect(aptUrl({
      regionCode: "11230",
      slug: "11230-164",
    })).toBe("/apt/11230/164");
  });

  it("keeps non-prefixed slugs intact", () => {
    expect(toUrlSlug("11230", "래미안")).toBe("래미안");
    expect(toDbSlug("11230", "래미안")).toBe("래미안");
  });

  it("restores numeric URL slugs to DB slugs", () => {
    expect(toDbSlug("11230", "164")).toBe("11230-164");
  });

  it("creates fallback slugs from region code and apt name", () => {
    expect(makeSlug("11680", "래미안 아파트")).toBe("11680-래미안-아파트");
  });

  it("detects legacy detail URLs that should redirect to canonical URLs", () => {
    expect(shouldRedirectToAptCanonical(
      "/apt/11230/164",
      "/apt/11230-164"
    )).toBe(true);
  });

  it("does not redirect equivalent encoded Korean fallback URLs", () => {
    expect(shouldRedirectToAptCanonical(
      "/apt/11230/%EB%9E%98%EB%AF%B8%EC%95%88",
      "/apt/11230/래미안"
    )).toBe(false);
  });

  it("ignores trailing slashes when comparing canonical URLs", () => {
    expect(shouldRedirectToAptCanonical(
      "/apt/11230-164/",
      "/apt/11230-164"
    )).toBe(false);
  });
});
