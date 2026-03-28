import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptTransactions, aptComplexes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "11230-두산";

  try {
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
      complex: { id: complex.id, aptName: complex.aptName, regionCode: complex.regionCode, slug: complex.slug },
      txnCount: txns.length,
      txnSample: txns,
      txnKeys: txns.length > 0 ? Object.keys(txns[0]) : [],
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "unknown",
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
    }, { status: 500 });
  }
}
