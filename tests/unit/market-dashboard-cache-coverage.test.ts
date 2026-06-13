import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("market dashboard cache coverage", () => {
  it("keeps market aggregate and region reads behind tagged server caches", () => {
    const source = read("src/lib/market-dashboard-query.ts");

    expect(source).toContain('import { unstable_cache } from "next/cache"');
    expect(source).toContain("PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS");
    expect(source).toContain("export const getCachedMarketSidoStats = unstable_cache");
    expect(source).toContain("export const getCachedMarketSigunguStats = unstable_cache");
    expect(source).toContain("export const getCachedMarketSigunguTransactions = unstable_cache");
  });

  it("uses cached market reads from public market pages", () => {
    const marketIndex = read("src/app/market/page.tsx");
    const sidoPage = read("src/app/market/[sido]/page.tsx");
    const sigunguPage = read("src/app/market/[sido]/[sigungu]/page.tsx");

    expect(marketIndex).toContain("getCachedMarketSidoStats");
    expect(sidoPage).toContain("getCachedMarketSigunguStats");
    expect(sigunguPage).toContain("getCachedMarketSigunguTransactions");
    expect(sidoPage).not.toContain('from "@/lib/db"');
    expect(sigunguPage).not.toContain('from "@/lib/db"');
  });
});
