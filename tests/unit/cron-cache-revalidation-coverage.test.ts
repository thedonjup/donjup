import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

type RouteExpectation = {
  route: string;
  helper?: string;
  tags: string[];
};

const routeExpectations: RouteExpectation[] = [
  {
    route: "src/app/api/cron/fetch-transactions/route.ts",
    tags: [
      "PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS",
      "PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES",
    ],
  },
  {
    route: "src/app/api/cron/fetch-rents/route.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS"],
  },
  {
    route: "src/app/api/cron/enrich-complexes/route.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES"],
  },
  {
    route: "src/app/api/cron/geocode-complexes/route.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES"],
  },
  {
    route: "src/app/api/cron/geocode-kapt/route.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES"],
  },
  {
    route: "src/app/api/cron/fetch-bank-rates/route.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES"],
  },
  {
    route: "src/app/api/cron/fetch-rates/route.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES"],
  },
  {
    route: "src/app/api/cron/generate-report/route.ts",
    helper: "src/lib/cron-generate-report.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.DAILY_REPORTS"],
  },
  {
    route: "src/app/api/cron/refresh-cache/route.ts",
    helper: "src/lib/cron-refresh-homepage-cache.ts",
    tags: ["PUBLIC_DATA_CACHE_TAGS.HOMEPAGE"],
  },
];

describe("cron cache revalidation coverage", () => {
  it("revalidates public data caches after cron mutations", () => {
    const missing = routeExpectations.filter(({ route, helper, tags }) => {
      const sourcePaths = helper ? [route, helper] : [route];
      const source = sourcePaths
        .map((sourcePath) => readFileSync(path.resolve(process.cwd(), sourcePath), "utf8"))
        .join("\n");

      return !(
        source.includes("revalidatePublicDataCaches") &&
        source.includes("cacheRevalidation") &&
        tags.every((tag) => source.includes(tag))
      );
    });

    expect(missing.map(({ route }) => route)).toEqual([]);
  });
});
