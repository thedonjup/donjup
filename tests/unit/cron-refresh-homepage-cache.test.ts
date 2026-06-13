import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

import { homepageCacheUpsertValues } from "@/lib/cron-refresh-homepage-cache";

describe("cron refresh homepage cache helper", () => {
  it("builds homepage cache upsert values without JSON roundtripping", () => {
    const updatedAt = new Date("2026-05-03T00:00:00.000Z");
    const dropsRows = [{ id: "drop-1" }];
    const highsRows = [{ id: "high-1" }];
    const volumeRows = [{ id: "volume-1" }];
    const recentRows = [{ id: "recent-1" }];
    const ratesRows = [{ rate_type: "BASE_RATE" }];

    expect(
      homepageCacheUpsertValues({
        dropsRows,
        highsRows,
        volumeRows,
        recentRows,
        ratesRows,
        totalTransactions: 123,
        totalComplexes: 45,
        updatedAt,
      })
    ).toEqual({
      id: 1,
      drops: dropsRows,
      highs: highsRows,
      volume: volumeRows,
      recent: recentRows,
      rates: ratesRows,
      totalTransactions: 123,
      totalComplexes: 45,
      updatedAt,
    });
  });
});
