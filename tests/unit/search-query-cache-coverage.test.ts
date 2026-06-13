import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("search query cache coverage", () => {
  it("exports a short-lived cached search query for server-rendered search pages", () => {
    const source = read("src/lib/search-query.ts");

    expect(source).toContain('import { unstable_cache } from "next/cache"');
    expect(source).toContain("export const getCachedSearchResults = unstable_cache");
    expect(source).toContain("revalidate: 300");
    expect(source).toContain("PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES");
    expect(source).toContain("PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS");
  });

  it("uses the cached query on the search page", () => {
    const source = read("src/app/search/page.tsx");

    expect(source).toContain("getCachedSearchResults");
    expect(source).not.toContain("getSearchResults({");
  });

  it("uses the cached query from the public search API", () => {
    const source = read("src/app/api/search/route.ts");

    expect(source).toContain("getCachedSearchResults");
    expect(source).toContain("parseSearchSort");
    expect(source).toContain("publicApiCacheHeaders");
    expect(source).not.toContain('from "@/lib/db"');
    expect(source).not.toContain('from "drizzle-orm"');
    expect(source).not.toContain("db.execute");
  });

  it("keeps region alias matching in the shared search query", () => {
    const source = read("src/lib/search-query.ts");

    expect(source).toContain("searchRegionCode");
    expect(source).toContain("c.region_code LIKE");
    expect(source).toContain("c.region_code =");
  });
});
