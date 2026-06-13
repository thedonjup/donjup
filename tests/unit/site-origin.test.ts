import { afterEach, describe, expect, it } from "vitest";
import { isAllowedSiteOrigin, isAllowedSiteRequest } from "@/lib/api/site-origin";

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("site origin guard", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.DONJUP_APP_ORIGIN;
    delete process.env.VERCEL_URL;
  });

  it("allows configured production origins", () => {
    expect(isAllowedSiteOrigin("https://donjup.com", "production")).toBe(true);
    expect(isAllowedSiteOrigin("https://www.donjup.com", "production")).toBe(true);
  });

  it("allows deployment origins configured by environment", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.donjup.com/some-path";
    process.env.DONJUP_APP_ORIGIN = "https://app.donjup.com";
    process.env.VERCEL_URL = "donjup-git-main.vercel.app";

    expect(isAllowedSiteOrigin("https://preview.donjup.com", "production")).toBe(true);
    expect(isAllowedSiteOrigin("https://app.donjup.com", "production")).toBe(true);
    expect(isAllowedSiteOrigin("https://donjup-git-main.vercel.app", "production")).toBe(true);
  });

  it("allows loopback origins for local production smoke tests", () => {
    expect(isAllowedSiteOrigin("http://127.0.0.1:3020", "production")).toBe(true);
    expect(isAllowedSiteOrigin("http://localhost:3000", "production")).toBe(true);
  });

  it("blocks missing or untrusted origins in production", () => {
    expect(isAllowedSiteOrigin(null, "production")).toBe(false);
    expect(isAllowedSiteOrigin("https://evil.example", "production")).toBe(false);
  });

  it("stays open in non-production environments for local tests and development", () => {
    expect(isAllowedSiteOrigin(null, "test")).toBe(true);
    expect(isAllowedSiteOrigin("http://localhost:3000", "development")).toBe(true);
    expect(isAllowedSiteRequest(headers({}), "test")).toBe(true);
  });

  it("allows production requests from configured origin or referer headers", () => {
    expect(isAllowedSiteRequest(headers({
      origin: "https://donjup.com",
    }), "production")).toBe(true);
    expect(isAllowedSiteRequest(headers({
      referer: "https://www.donjup.com/map?address=test",
    }), "production")).toBe(true);
  });

  it("blocks missing or untrusted production request sources", () => {
    expect(isAllowedSiteRequest(headers({}), "production")).toBe(false);
    expect(isAllowedSiteRequest(headers({
      referer: "https://evil.example/map",
    }), "production")).toBe(false);
    expect(isAllowedSiteRequest(headers({
      origin: "https://evil.example",
      referer: "https://donjup.com/map",
    }), "production")).toBe(false);
  });
});
