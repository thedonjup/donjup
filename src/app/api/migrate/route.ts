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
    // Add govt_complex_id column to apt_complexes
    await db.execute(sql`ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS govt_complex_id TEXT UNIQUE`);
    results.push("govt_complex_id column added (or already exists)");
  } catch (e) {
    results.push(`govt_complex_id: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  return NextResponse.json({ ok: true, results });
}
