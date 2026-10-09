import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMolitRows } from "../../scripts/local-data-pipeline.mjs";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("MOLIT collection boundary", () => {
  it("checks budget before issuing an HTTP request", async () => {
    vi.stubEnv("MOLIT_API_KEY", "unit-test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMolitRows("sale", "11110", "202610", 1000, () => { throw new Error("budget exhausted"); }))
      .rejects.toThrow("budget exhausted");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not accept a successful HTTP response with the wrong page", async () => {
    vi.stubEnv("MOLIT_API_KEY", "unit-test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "<resultCode>000</resultCode><totalCount>0</totalCount><pageNo>2</pageNo>",
    )));
    await expect(fetchMolitRows("sale", "11110", "202610")).rejects.toThrow("pageNo");
  });
});
