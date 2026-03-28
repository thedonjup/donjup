import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptTransactions, aptComplexes } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "11230-두산";

  try {
    // Step 0: Check actual DB columns
    const colCheck = await db.execute(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'apt_complexes' ORDER BY ordinal_position`
    );
    const dbColumns = colCheck.rows.map((r: Record<string, unknown>) => r.column_name);

    // Step 0b: Try raw SQL query
    const rawResult = await db.execute(
      sql`SELECT id, apt_name, region_code, slug FROM apt_complexes WHERE slug = ${slug} LIMIT 1`
    );

    // Step 1: Find complex
    const complexRows = await db.select().from(aptComplexes)
      .where(eq(aptComplexes.slug, slug))
      .limit(1);

    if (complexRows.length === 0) {
      return NextResponse.json({ error: "Complex not found", slug, step: "complex_lookup" });
    }

    const complex = complexRows[0];

    // Step 2: Query transactions
    const txns = await db.select({
      id: aptTransactions.id,
      size_sqm: aptTransactions.sizeSqm,
      floor: aptTransactions.floor,
      trade_price: aptTransactions.tradePrice,
      trade_date: aptTransactions.tradeDate,
    }).from(aptTransactions)
      .where(and(
        eq(aptTransactions.aptName, complex.aptName),
        eq(aptTransactions.regionCode, complex.regionCode),
      ))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(5);

    return NextResponse.json({
      dbColumns,
      rawResult: rawResult.rows.slice(0, 2),
      complex: { id: complex.id, aptName: complex.aptName, regionCode: complex.regionCode, slug: complex.slug },
      txnCount: txns.length,
      txnSample: txns,
      txnKeys: txns.length > 0 ? Object.keys(txns[0]) : [],
    });
  } catch (err) {
    // Try raw SQL even if Drizzle fails
    let dbColumns: unknown[] = [];
    let rawResult: unknown[] = [];
    try {
      const colCheck = await db.execute(
        sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'apt_complexes' ORDER BY ordinal_position`
      );
      dbColumns = colCheck.rows.map((r: Record<string, unknown>) => r.column_name);
      const raw = await db.execute(
        sql`SELECT id, apt_name, slug FROM apt_complexes WHERE slug = ${slug} LIMIT 1`
      );
      rawResult = raw.rows;
    } catch { /* ignore */ }

    return NextResponse.json({
      error: err instanceof Error ? err.message : "unknown",
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
      dbColumns,
      rawResult,
    }, { status: 500 });
  }
}
