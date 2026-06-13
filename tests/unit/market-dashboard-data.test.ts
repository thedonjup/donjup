import { describe, expect, it } from "vitest";
import {
  createMarketStatsCutoffDate,
  getMarketSidoEntries,
} from "@/lib/market-dashboard-data";

describe("market dashboard data helpers", () => {
  it("exposes configured sido entries", () => {
    const entries = getMarketSidoEntries();

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some(([, sido]) => sido.slug === "seoul")).toBe(true);
  });

  it("creates a three month market stats cutoff date", () => {
    expect(createMarketStatsCutoffDate(new Date("2026-04-29T00:00:00.000Z")))
      .toBe("2026-01-29");
  });
});
