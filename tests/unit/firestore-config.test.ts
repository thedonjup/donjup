import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("firestore config", () => {
  it("keeps comment writes behind the server API", () => {
    const rules = readWorkspaceFile("firestore.rules");

    expect(rules).toContain("match /comments/{aptSlug}/messages/{messageId}");
    expect(rules).toContain("allow read: if true;");
    expect(rules).toContain("allow write: if false;");
    expect(rules).not.toMatch(/allow create: if request\.auth/);
    expect(rules).not.toMatch(/allow update, delete/);
  });

  it("declares the collection group index used by comment moderation", () => {
    const indexes = JSON.parse(readWorkspaceFile("firestore.indexes.json")) as {
      indexes: Array<{
        collectionGroup?: string;
        queryScope?: string;
        fields?: Array<{ fieldPath?: string; order?: string }>;
      }>;
    };

    expect(indexes.indexes).toContainEqual({
      collectionGroup: "messages",
      queryScope: "COLLECTION_GROUP",
      fields: [{ fieldPath: "createdAt", order: "DESCENDING" }],
    });
  });

  it("wires firestore rules and indexes for deployment", () => {
    const config = JSON.parse(readWorkspaceFile("firebase.json")) as {
      firestore?: { rules?: string; indexes?: string };
    };

    expect(config.firestore).toEqual({
      rules: "firestore.rules",
      indexes: "firestore.indexes.json",
    });
  });
});
