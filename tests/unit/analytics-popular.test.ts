import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pageviewStartDate } from "@/lib/analytics-popular";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("analytics popular helpers", () => {
  it("calculates the start date for a pageview window", () => {
    expect(pageviewStartDate(7, new Date("2026-04-26T12:00:00.000Z"))).toBe("2026-04-19");
  });

  it("keeps the public popular analytics API on the cached query helper", () => {
    const querySource = read("src/lib/analytics-popular-query.ts");
    const routeSource = read("src/app/api/analytics/popular/route.ts");

    expect(querySource).toContain('import { unstable_cache } from "next/cache"');
    expect(querySource).toContain("export const getCachedPopularPages = unstable_cache");
    expect(querySource).toContain("PUBLIC_DATA_CACHE_TAGS.PAGE_VIEWS");
    expect(routeSource).toContain("getCachedPopularPages");
    expect(routeSource).toContain("publicApiCacheHeaders");
    expect(routeSource).not.toContain('from "@/lib/db"');
    expect(routeSource).not.toContain('from "@/lib/db/schema"');
    expect(routeSource).not.toContain('from "drizzle-orm"');
  });
});
