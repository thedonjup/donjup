import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("analytics pageview route coverage", () => {
  it("checks site origin before parsing or recording pageviews", () => {
    const source = read("src/app/api/analytics/pageview/route.ts");
    const originIndex = source.indexOf("if (!isAllowedSiteRequest");
    const parseIndex = source.indexOf("const parsed = parsePageviewRequest");
    const dedupeIndex = source.indexOf("shouldRecordPageview({");
    const sampleIndex = source.indexOf("shouldSamplePageviewWrite({");
    const recordIndex = source.indexOf("await recordPageview");

    expect(originIndex).toBeGreaterThanOrEqual(0);
    expect(parseIndex).toBeGreaterThan(originIndex);
    expect(dedupeIndex).toBeGreaterThan(parseIndex);
    expect(sampleIndex).toBeGreaterThan(dedupeIndex);
    expect(recordIndex).toBeGreaterThan(sampleIndex);
    expect(source).toContain('return NextResponse.json({ error: "Forbidden" }, { status: 403 })');
  });

  it("keeps the database write inside the pageview helper", () => {
    const routeSource = read("src/app/api/analytics/pageview/route.ts");
    const helperSource = read("src/lib/analytics-pageview.ts");

    expect(routeSource).toContain("recordPageview");
    expect(routeSource).toContain("isAllowedSiteRequest");
    expect(routeSource).toContain("pageviewClientFingerprint");
    expect(routeSource).toContain("shouldRecordPageview");
    expect(routeSource).toContain("shouldSamplePageviewWrite");
    expect(routeSource).not.toContain('from "@/lib/db"');
    expect(routeSource).not.toContain('from "@/lib/db/schema"');
    expect(routeSource).not.toContain('from "drizzle-orm"');
    expect(helperSource).toContain("onConflictDoUpdate");
    expect(helperSource).toContain("viewCount: sql");
  });
});
