import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  const migrations = [
    "ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS govt_complex_id TEXT UNIQUE",
    "ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS property_type INTEGER DEFAULT 1",
    "ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS sido_name TEXT",
  ];

  for (const m of migrations) {
    try {
      await db.execute(sql.raw(m));
      results.push(`OK: ${m.substring(0, 60)}...`);
    } catch (e) {
      results.push(`FAIL: ${m.substring(0, 40)}... — ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return NextResponse.json({ ok: true, results });
}
