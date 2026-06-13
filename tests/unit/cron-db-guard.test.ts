import { beforeEach, describe, expect, it, vi } from "vitest";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { checkDatabaseHealth } from "@/lib/db/health";
import { logger } from "@/lib/logger";

vi.mock("@/lib/db/health", () => ({
  checkDatabaseHealth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("cronDatabaseGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows cron execution when database health is ok", async () => {
    vi.mocked(checkDatabaseHealth).mockResolvedValue({
      status: 200,
      body: {
        ok: true,
        code: "OK",
        message: "ok",
      },
    });

    await expect(cronDatabaseGuard("fetch-rates")).resolves.toBeNull();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("returns a safe skip response when the database is unavailable", async () => {
    vi.mocked(checkDatabaseHealth).mockResolvedValue({
      status: 503,
      body: {
        ok: false,
        code: "DB_UNAVAILABLE",
        message: "database temporarily unavailable",
      },
    });

    const response = await cronDatabaseGuard("fetch-rates");

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toEqual({
      success: false,
      skipped: true,
      code: "DB_UNAVAILABLE",
      message: "database temporarily unavailable",
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Cron skipped because database is unavailable",
      {
        cron: "fetch-rates",
        code: "DB_UNAVAILABLE",
        status: 503,
      }
    );
  });
});
