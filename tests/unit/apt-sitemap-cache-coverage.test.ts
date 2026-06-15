import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("apt sitemap cache coverage", () => {
  it("keeps apt sitemap database reads behind the apt-complexes cache tag", () => {
    const source = read("src/lib/apt-sitemap-query.ts");

    expect(source).toContain('import { unstable_cache } from "next/cache"');
    expect(source).toContain("export const getCachedAptSitemapItems = unstable_cache");
    expect(source).toContain("revalidate: 86400");
    expect(source).toContain("PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES");
    expect(source).toContain("regionCode: aptComplexes.regionCode");
    expect(source).toContain("slug: aptComplexes.slug");
    expect(source).not.toContain("isNotNull");
  });

  it("uses the cached sitemap helper from the apt sitemap route", () => {
    const source = read("src/app/apt/sitemap.ts");

    expect(source).toContain("getCachedAptSitemapItems");
    expect(source).toContain("aptUrl");
    expect(source).toContain("govtComplexId: c.govtComplexId");
    expect(source).not.toContain('from "@/lib/db"');
    expect(source).not.toContain("aptComplexes");
  });
});
