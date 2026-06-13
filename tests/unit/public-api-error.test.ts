import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFetchJsonCache,
  DATA_UNAVAILABLE_MESSAGE,
  fetchJson,
  messageFromUnknownError,
  publicApiErrorMessage,
} from "@/lib/public-api-error";

const originalFetch = global.fetch;

describe("public API error helpers", () => {
  afterEach(() => {
    clearFetchJsonCache();
    global.fetch = originalFetch;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("maps DB_UNAVAILABLE to a user-friendly message", () => {
    expect(
      publicApiErrorMessage(
        {
          code: "DB_UNAVAILABLE",
          error: "데이터베이스를 일시적으로 사용할 수 없습니다.",
        },
        503
      )
    ).toBe(DATA_UNAVAILABLE_MESSAGE);
  });

  it("uses API error messages for non-DB failures", () => {
    expect(publicApiErrorMessage({ error: "Invalid request" }, 400)).toBe(
      "Invalid request"
    );
  });

  it("uses a generic message for raw server failures", () => {
    expect(publicApiErrorMessage(null, 500)).toBe(
      "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  });

  it("extracts messages from unknown errors", () => {
    expect(messageFromUnknownError(new Error("검색 실패"))).toBe("검색 실패");
    expect(messageFromUnknownError("bad")).toBe(
      "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  });

  it("throws mapped errors from failed JSON requests", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: "DB_UNAVAILABLE" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
    ) as unknown as typeof fetch;

    await expect(fetchJson("/api/search?q=test")).rejects.toThrow(
      DATA_UNAVAILABLE_MESSAGE
    );
  });

  it("deduplicates concurrent browser GET requests", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ value: "cached" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const [first, second] = await Promise.all([
      fetchJson<{ value: string }>("/api/search?q=test"),
      fetchJson<{ value: string }>("/api/search?q=test"),
    ]);

    expect(first).toEqual({ value: "cached" });
    expect(second).toEqual({ value: "cached" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses successful browser GET responses during the cache window", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 2 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchJson<{ value: number }>("/api/bank-rates")).resolves.toEqual({
      value: 1,
    });
    await expect(fetchJson<{ value: number }>("/api/bank-rates")).resolves.toEqual({
      value: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("expires browser GET cache entries after the configured TTL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.stubGlobal("window", {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 2 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      fetchJson<{ value: number }>("/api/bank-rates", undefined, undefined, {
        cacheTtlMs: 10,
      })
    ).resolves.toEqual({ value: 1 });

    vi.setSystemTime(11);

    await expect(
      fetchJson<{ value: number }>("/api/bank-rates", undefined, undefined, {
        cacheTtlMs: 10,
      })
    ).resolves.toEqual({ value: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache POST requests", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 2 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const init = { method: "POST", body: "{}" };
    await expect(fetchJson<{ value: number }>("/api/rate/calculate", init)).resolves.toEqual({
      value: 1,
    });
    await expect(fetchJson<{ value: number }>("/api/rate/calculate", init)).resolves.toEqual({
      value: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retain failed GET responses", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "DB_UNAVAILABLE" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchJson("/api/search?q=test")).rejects.toThrow(
      DATA_UNAVAILABLE_MESSAGE
    );
    await expect(fetchJson<{ value: string }>("/api/search?q=test")).resolves.toEqual({
      value: "ok",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
