import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";

type DebugAptSnapshot = {
  dbColumns: string[];
  rawResult: Record<string, unknown>[];
  complex: {
    id: string;
    aptName: string;
    regionCode: string;
    slug: string;
  };
  txnCount: number;
  txnSample: Array<{
    id: string;
    size_sqm: string;
    floor: number | null;
    trade_price: number;
    trade_date: string;
  }>;
  txnKeys: string[];
};

function columnName(row: unknown): string | null {
  if (typeof row !== "object" || row === null) return null;

  const value = (row as Record<string, unknown>).column_name;
  return typeof value === "string" ? value : null;
}

export async function getDebugAptSnapshot(
  slug: string
): Promise<DebugAptSnapshot | null> {
  const columnCheck = await db.execute(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'apt_complexes' ORDER BY ordinal_position`
  );
  const dbColumns = columnCheck.rows
    .map((row) => columnName(row))
    .filter((name): name is string => Boolean(name));

  const rawResult = await db.execute(
    sql`SELECT id, apt_name, region_code, slug FROM apt_complexes WHERE slug = ${slug} LIMIT 1`
  );

  const complexRows = await db
    .select({
      id: aptComplexes.id,
      aptName: aptComplexes.aptName,
      regionCode: aptComplexes.regionCode,
      slug: aptComplexes.slug,
    })
    .from(aptComplexes)
    .where(eq(aptComplexes.slug, slug))
    .limit(1);

  const complex = complexRows[0];
  if (!complex) {
    return null;
  }

  const txns = await db
    .select({
      id: aptTransactions.id,
      size_sqm: aptTransactions.sizeSqm,
      floor: aptTransactions.floor,
      trade_price: aptTransactions.tradePrice,
      trade_date: aptTransactions.tradeDate,
    })
    .from(aptTransactions)
    .where(
      and(
        eq(aptTransactions.aptName, complex.aptName),
        eq(aptTransactions.regionCode, complex.regionCode)
      )
    )
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(5);

  return {
    dbColumns,
    rawResult: rawResult.rows.slice(0, 2),
    complex,
    txnCount: txns.length,
    txnSample: txns,
    txnKeys: txns.length > 0 ? Object.keys(txns[0] ?? {}) : [],
  };
}
