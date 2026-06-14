import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("comments route coverage", () => {
  it("checks request source and auth before parsing or writing comments", () => {
    const source = read("src/app/api/comments/route.ts");
    const siteGuardIndex = source.indexOf("if (!isAllowedSiteRequest");
    const authIndex = source.indexOf("const authResult = await verifyFirebaseAuth");
    const parseIndex = source.indexOf("const parsed = parseCommentCreateRequest");
    const dedupeIndex = source.indexOf("if (!shouldCreateComment");
    const saveIndex = source.indexOf("await saveComment");

    expect(siteGuardIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeGreaterThan(siteGuardIndex);
    expect(parseIndex).toBeGreaterThan(authIndex);
    expect(dedupeIndex).toBeGreaterThan(parseIndex);
    expect(saveIndex).toBeGreaterThan(dedupeIndex);
    expect(source).toContain('return NextResponse.json({ error: "Forbidden" }, { status: 403 })');
  });

  it("keeps Firestore write details inside the comment store helper", () => {
    const routeSource = read("src/app/api/comments/route.ts");
    const helperSource = read("src/lib/comment-store.ts");

    expect(routeSource).toContain("saveComment");
    expect(routeSource).toContain("shouldCreateComment");
    expect(routeSource).not.toContain("FieldValue");
    expect(routeSource).not.toContain(".collection(\"comments\")");
    expect(helperSource).toContain("FieldValue.serverTimestamp");
    expect(helperSource).toContain(".collection(\"comments\")");
  });
});
