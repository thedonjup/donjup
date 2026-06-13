import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const cachedPublicGetRoutes = [
  "src/app/api/analytics/popular/route.ts",
  "src/app/api/apt/[id]/route.ts",
  "src/app/api/apt/extremes/route.ts",
  "src/app/api/apt/route.ts",
  "src/app/api/bank-rates/route.ts",
  "src/app/api/coupang/products/route.ts",
  "src/app/api/daily/[date]/route.ts",
  "src/app/api/daily/route.ts",
  "src/app/api/news/route.ts",
  "src/app/api/rate/history/route.ts",
  "src/app/api/search/route.ts",
];

describe("public API cache coverage", () => {
  it("keeps high-read public GET routes behind the shared cache helper", () => {
    const missingCache = cachedPublicGetRoutes.filter((relativePath) => {
      const source = readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

      return !source.includes("publicApiCacheHeaders");
    });

    expect(missingCache).toEqual([]);
  });
});
