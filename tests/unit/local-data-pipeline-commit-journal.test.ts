import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { insertChunkReturningIds } from "../../scripts/local-data-pipeline.mjs";

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function fixture(failCommit = false) {
  const dir = mkdtempSync(join(tmpdir(), "donjup-journal-"));
  directories.push(dir);
  const idsPath = join(dir, "inserted-sale-ids.jsonl");
  const commands: string[] = [];
  return { dir, idsPath, commands, pool: {
    uploadJournal: { dir, deadline: Date.now() + 10000, files: { apt_transactions: idsPath } },
    async query(sql: string, values?: string[]) {
      commands.push(sql.trim().split(/\s+/)[0]);
      if (sql === "COMMIT" && failCommit) throw new Error("ambiguous commit");
      return { rows: sql.includes("RETURNING id") ? (values || []).map((id) => ({ id })) : [] };
    },
  } };
}

describe("scoped upload commit journal", () => {
  it("keeps rollback IDs on replay and commits in bounded chunks", async () => {
    const f = fixture();
    await insertChunkReturningIds(f.pool, "apt_transactions", ["id"], [{ id: "first" }], "id");
    await insertChunkReturningIds(f.pool, "apt_transactions", ["id"], [{ id: "second" }], "id");
    expect(readFileSync(f.idsPath, "utf8").trim().split("\n").map((line) => JSON.parse(line).id))
      .toEqual(["first", "second"]);
    expect(f.commands.filter((command) => command === "COMMIT")).toHaveLength(2);
    const journals = readdirSync(f.dir).filter((name) => name.startsWith("commit-"));
    expect(journals.every((name) => JSON.parse(readFileSync(join(f.dir, name), "utf8")).state === "committed")).toBe(true);
  });

  it("retains pending inserted IDs if the commit outcome is uncertain", async () => {
    const f = fixture(true);
    await expect(insertChunkReturningIds(f.pool, "apt_transactions", ["id"], [{ id: "uncertain" }], "id"))
      .rejects.toThrow("ambiguous commit");
    const name = readdirSync(f.dir).find((file) => file.startsWith("commit-"))!;
    const journal = JSON.parse(readFileSync(join(f.dir, name), "utf8"));
    expect(journal.state).toBe("pending");
    expect(journal.ids).toEqual(["uncertain"]);
  });
});
