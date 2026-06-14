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

  it("runs only for legacy apartment URL paths", () => {
    expect(config.matcher).toEqual(["/apt/:region/:slug*"]);
  });
});
