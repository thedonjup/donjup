import { describe, expect, it, vi } from "vitest";
import { databaseHealthResult } from "@/lib/db/health";

describe("database health", () => {
  it("returns ok when the database check succeeds", async () => {
    await expect(databaseHealthResult(async () => undefined)).resolves.toEqual({
      status: 200,
      body: {
        ok: true,
        code: "OK",
        message: "ok",
      },
    });
  });

  it("maps resource limit failures to a safe 503 response", async () => {
    const error = new Error("query failed");
    Object.defineProperty(error, "cause", {
      value: {
        code: "53300",
        message:
          "This cluster has reached its Request Unit limit for the month and is now disabled.",
      },
    });
    const onError = vi.fn();

    const result = await databaseHealthResult(async () => {
      throw error;
    }, onError);

    expect(result).toMatchObject({
      status: 503,
      body: {
        ok: false,
        code: "DB_UNAVAILABLE",
      },
    });
    expect(result.body.message).not.toContain("Request Unit limit");
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("keeps ordinary database failures generic", async () => {
    const result = await databaseHealthResult(async () => {
      throw {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      };
    });

    expect(result).toMatchObject({
      status: 500,
      body: {
        ok: false,
        code: "INTERNAL_ERROR",
      },
    });
    expect(result.body.message).not.toContain("duplicate key");
  });
});
