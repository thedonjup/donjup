import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    await db.execute(sql`ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS govt_complex_id TEXT UNIQUE`);
    results.push("OK: govt_complex_id");
  } catch (e) { results.push(`FAIL govt_complex_id: ${e instanceof Error ? e.message : "?"}`); }

  try {
    await db.execute(sql`ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS property_type INTEGER DEFAULT 1`);
    results.push("OK: property_type");
  } catch (e) { results.push(`FAIL property_type: ${e instanceof Error ? e.message : "?"}`); }

  try {
    await db.execute(sql`ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS sido_name TEXT`);
    results.push("OK: sido_name");
  } catch (e) { results.push(`FAIL sido_name: ${e instanceof Error ? e.message : "?"}`); }

  return NextResponse.json({ ok: true, results });
}
