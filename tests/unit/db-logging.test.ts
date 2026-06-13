import { describe, expect, it } from "vitest";
import { databaseLogContext, databaseLogLevel } from "@/lib/db/logging";

describe("database logging helpers", () => {
  it("treats database resource limits as warning-level recoverable failures", () => {
    const error = new Error("Failed query");
    Object.defineProperty(error, "cause", {
      value: {
        code: "53300",
        message:
          "This cluster has reached its Request Unit limit for the month and is now disabled.",
      },
    });

    expect(databaseLogLevel(error)).toBe("warn");
    expect(databaseLogContext(error, { route: "/rate" })).toEqual({
      route: "/rate",
      summary: "database resource limit reached",
    });
  });

  it("keeps ordinary database failures at error level without attaching raw errors", () => {
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };

    expect(databaseLogLevel(error)).toBe("error");
    expect(databaseLogContext(error, { route: "/api/search" })).toEqual({
      route: "/api/search",
      summary: "23505: duplicate key value violates unique constraint",
    });
    expect(databaseLogContext(error)).not.toHaveProperty("error");
  });
});
