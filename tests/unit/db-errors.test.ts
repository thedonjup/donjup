import { describe, expect, it } from "vitest";
import {
  databaseErrorStatus,
  isDatabaseResourceLimitError,
  publicDatabaseError,
  summarizeDatabaseError,
} from "@/lib/db/errors";

describe("database error helpers", () => {
  it("summarizes CockroachDB resource limit errors without leaking a stack", () => {
    const error = new Error("Failed query");
    Object.defineProperty(error, "cause", {
      value: {
        code: "53300",
        message:
          "This cluster has reached its Request Unit limit for the month and is now disabled.",
      },
    });

    expect(summarizeDatabaseError(error)).toBe("database resource limit reached");
    expect(isDatabaseResourceLimitError(error)).toBe(true);
    expect(databaseErrorStatus(error)).toBe(503);
    expect(publicDatabaseError(error)).toMatchObject({
      status: 503,
      code: "DB_UNAVAILABLE",
      message: "데이터베이스를 일시적으로 사용할 수 없습니다.",
    });
  });

  it("includes concise code and message for ordinary database errors", () => {
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };

    expect(summarizeDatabaseError(error)).toBe(
      "23505: duplicate key value violates unique constraint"
    );
    expect(isDatabaseResourceLimitError(error)).toBe(false);
    expect(databaseErrorStatus(error)).toBe(500);
    expect(publicDatabaseError(error)).toMatchObject({
      status: 500,
      code: "INTERNAL_ERROR",
    });
  });

  it("handles string errors", () => {
    expect(summarizeDatabaseError("connection failed")).toBe("connection failed");
  });

  it("keeps public database errors free of raw database messages", () => {
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint users_email_key",
    };

    expect(publicDatabaseError(error)).toEqual({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "서버 오류가 발생했습니다",
    });
  });
});
