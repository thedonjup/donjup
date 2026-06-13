import { testApiHandler } from "next-test-api-route-handler";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/db", () => {
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };

  return { db: mockChain };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import * as appHandler from "@/app/api/analytics/pageview/route";
import { resetPageviewDedupeForTests } from "@/lib/analytics-pageview-dedupe";
import { db } from "@/lib/db";

const dbMock = db as unknown as Record<string, Mock>;

describe("POST /api/analytics/pageview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPageviewDedupeForTests();
    delete process.env.DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE;
    dbMock.insert.mockReturnThis();
    dbMock.values.mockReturnThis();
    dbMock.onConflictDoUpdate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE;
  });

  it("tracks valid pageview payloads", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ pagePath: "/apt/123" }),
          headers: { "Content-Type": "application/json" },
        });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ success: true });
        expect(dbMock.insert).toHaveBeenCalled();
      },
    });
  });

  it("returns 400 for invalid JSON", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: "{",
          headers: { "Content-Type": "application/json" },
        });

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(typeof json.error).toBe("string");
      },
    });
  });

  it("keeps analytics best-effort when database writes fail", async () => {
    const error = new Error("query failed");
    Object.defineProperty(error, "cause", {
      value: {
        code: "53300",
        message:
          "This cluster has reached its Request Unit limit for the month and is now disabled.",
      },
    });
    dbMock.onConflictDoUpdate.mockRejectedValueOnce(error);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ pagePath: "/search" }),
          headers: { "Content-Type": "application/json" },
        });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ success: true });
      },
    });
  });

  it("dedupes immediate repeated pageview writes from the same client and path", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const payload = JSON.stringify({ pagePath: "/apt/dedupe-test" });
        const headers = {
          "Content-Type": "application/json",
          "User-Agent": "dedupe-test-agent",
          "X-Forwarded-For": "203.0.113.77",
        };

        const first = await fetch({ method: "POST", body: payload, headers });
        const second = await fetch({ method: "POST", body: payload, headers });

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        await expect(second.json()).resolves.toEqual({ success: true });
        expect(dbMock.insert).toHaveBeenCalledTimes(1);
      },
    });
  });

  it("can disable database pageview writes for free-tier operation", async () => {
    process.env.DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE = "0";

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ pagePath: "/apt/free-tier-test" }),
          headers: { "Content-Type": "application/json" },
        });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ success: true });
        expect(dbMock.insert).not.toHaveBeenCalled();
      },
    });
  });
});
