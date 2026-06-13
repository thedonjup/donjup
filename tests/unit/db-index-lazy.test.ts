import { afterEach, describe, expect, it, vi } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;

describe("database entrypoint", () => {
  afterEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("does not require DATABASE_URL when the module is imported", async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;

    await expect(import("@/lib/db")).resolves.toHaveProperty("db");
  });

  it("requires DATABASE_URL when the database is accessed", async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;

    const { db } = await import("@/lib/db");

    expect(() => Reflect.get(db, "select")).toThrow(
      "[db] DATABASE_URL environment variable is not set"
    );
  });
});
