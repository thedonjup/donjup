import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  parseAptExtremesLimit,
  parseAptExtremeType,
} from "@/lib/apt-extremes-params";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("apt extremes query", () => {
  it("parses allowed extreme types", () => {
    expect(parseAptExtremeType(null)).toBe("drop");
    expect(parseAptExtremeType("")).toBe("drop");
    expect(parseAptExtremeType("drop")).toBe("drop");
    expect(parseAptExtremeType("high")).toBe("high");
  });

  it("rejects unknown extreme types", () => {
    expect(parseAptExtremeType("latest")).toBeNull();
    expect(parseAptExtremeType("drop/high")).toBeNull();
    expect(parseAptExtremeType("HIGH")).toBeNull();
  });

  it("parses bounded result limits", () => {
    expect(parseAptExtremesLimit("20")).toBe(20);
    expect(parseAptExtremesLimit("500")).toBe(50);
    expect(parseAptExtremesLimit("0")).toBe(10);
    expect(parseAptExtremesLimit("bad")).toBe(10);
  });

  it("keeps the public extremes API on the cached query helper", () => {
    const querySource = read("src/lib/apt-extremes-query.ts");
    const routeSource = read("src/app/api/apt/extremes/route.ts");

    expect(querySource).toContain('import { unstable_cache } from "next/cache"');
    expect(querySource).toContain("export const getCachedAptExtremeTransactions = unstable_cache");
    expect(querySource).toContain("PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS");
    expect(routeSource).toContain("parseAptExtremeType");
    expect(routeSource).toContain("getCachedAptExtremeTransactions");
    expect(routeSource).not.toContain('from "@/lib/db"');
    expect(routeSource).not.toContain('from "@/lib/db/schema"');
    expect(routeSource).not.toContain('from "drizzle-orm"');
  });
});
