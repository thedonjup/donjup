import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("apt detail query cache coverage", () => {
  it("keeps apartment detail reads behind tagged server caches", () => {
    const source = read("src/lib/apt-detail-query.ts");

    expect(source).toContain('import { unstable_cache } from "next/cache"');
    expect(source).toContain("export const getCachedAptDetailComplexByGovtId = unstable_cache");
    expect(source).toContain("export const getCachedAptDetailComplexByLookupId = unstable_cache");
    expect(source).toContain("export const getCachedAptDetailComplexBySlug = unstable_cache");
    expect(source).toContain("export const getCachedAptDetailSaleTransactions = unstable_cache");
    expect(source).toContain("export const getCachedAptDetailRentTransactions = unstable_cache");
    expect(source).toContain("export const getCachedAptDetailNearbyComplexes = unstable_cache");
    expect(source).toContain("PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES");
    expect(source).toContain("PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS");
    expect(source).toContain("PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS");
  });

  it("uses cached detail reads from apartment detail pages", () => {
    const govtIdPage = read("src/app/apt/[govtComplexId]/page.tsx");
    const slugPage = read("src/app/apt/[govtComplexId]/[slug]/page.tsx");

    for (const source of [govtIdPage, slugPage]) {
      expect(source).toContain("getCachedAptDetailSaleTransactions");
      expect(source).toContain("getCachedAptDetailRentTransactions");
      expect(source).toContain("getCachedAptDetailNearbyComplexes");
      expect(source).toContain("Promise.allSettled");
      expect(source).not.toContain('from "@/lib/db"');
      expect(source).not.toContain('from "@/lib/db/schema"');
      expect(source).not.toContain('from "drizzle-orm"');
    }

    expect(govtIdPage).toContain("getCachedAptDetailComplexByGovtId");
    expect(slugPage).toContain("getCachedAptDetailComplexBySlug");
  });

  it("uses cached detail reads from apartment OG image generators", () => {
    const govtIdOgImage = read("src/app/apt/[govtComplexId]/opengraph-image.tsx");
    const slugOgImage = read("src/app/apt/[govtComplexId]/[slug]/opengraph-image.tsx");

    for (const source of [govtIdOgImage, slugOgImage]) {
      expect(source).toContain("getCachedAptDetailSaleTransactions");
      expect(source).not.toContain('from "@/lib/db"');
      expect(source).not.toContain('from "@/lib/db/schema"');
      expect(source).not.toContain('from "drizzle-orm"');
    }

    expect(govtIdOgImage).toContain("getCachedAptDetailComplexByGovtId");
    expect(slugOgImage).toContain("getCachedAptDetailComplexBySlug");
  });

  it("uses cached detail reads from the public apartment detail API", () => {
    const source = read("src/app/api/apt/[id]/route.ts");

    expect(source).toContain("getCachedAptDetailComplexByLookupId");
    expect(source).toContain("getCachedAptDetailSaleTransactions");
    expect(source).toContain("getCachedAptDetailRentTransactions");
    expect(source).toContain("publicApiCacheHeaders");
    expect(source).not.toContain('from "@/lib/db"');
    expect(source).not.toContain('from "@/lib/db/schema"');
    expect(source).not.toContain('from "drizzle-orm"');
  });
});
