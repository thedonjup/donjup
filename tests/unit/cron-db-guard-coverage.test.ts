import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function routeFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...routeFiles(fullPath));
      continue;
    }

    if (entry === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

describe("cron database guard coverage", () => {
  it("guards every cron route that imports the database", () => {
    const cronDir = path.resolve(process.cwd(), "src/app/api/cron");
    const dbCronRoutes = routeFiles(cronDir).filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes('from "@/lib/db"');
    });

    const unguarded = dbCronRoutes.filter((file) => {
      const source = readFileSync(file, "utf8");
      return !source.includes("cronDatabaseGuard");
    });

    expect(unguarded.map((file) => path.relative(process.cwd(), file))).toEqual([]);
  });
});
