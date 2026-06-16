import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

function request(path: string): NextRequest {
  return new NextRequest(`https://donjup.com${path}`);
}

describe("proxy route redirects", () => {
  it("redirects legacy apartment detail URLs to canonical govtComplexId URLs", () => {
    const response = proxy(request("/apt/11230/164"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://donjup.com/apt/11230-164");
  });

  it("keeps Korean fallback apartment slugs in the canonical redirect", () => {
    const response = proxy(request("/apt/11230/%EB%9E%98%EB%AF%B8%EC%95%88"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://donjup.com/apt/11230-%EB%9E%98%EB%AF%B8%EC%95%88"
    );
  });

  it("redirects known legacy fallback aliases to identity canonical URLs", () => {
    const response = proxy(request("/apt/11230-%EB%8B%B5%EC%8B%AD%EB%A6%AC%EB%8F%99-%EB%91%90%EC%82%B0"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://donjup.com/apt/natural-11230-%EB%8B%B5%EC%8B%AD%EB%A6%AC%EB%8F%99-%EB%91%90%EC%82%B0-2000-1"
    );
  });

  it("redirects two-segment known fallback aliases directly to identity canonical URLs", () => {
    const response = proxy(request("/apt/11230/%EB%8B%B5%EC%8B%AD%EB%A6%AC%EB%8F%99-%EB%91%90%EC%82%B0"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://donjup.com/apt/natural-11230-%EB%8B%B5%EC%8B%AD%EB%A6%AC%EB%8F%99-%EB%91%90%EC%82%B0-2000-1"
    );
  });

  it("runs only for legacy apartment URL paths", () => {
    expect(config.matcher).toEqual(["/apt/:id", "/apt/:region/:slug*"]);
  });
});
