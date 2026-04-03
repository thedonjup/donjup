import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { isNull, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Find complexes with null govtComplexId
  const nullRows = await db.select({
    id: aptComplexes.id,
    regionCode: aptComplexes.regionCode,
    slug: aptComplexes.slug,
    aptName: aptComplexes.aptName,
  }).from(aptComplexes)
    .where(isNull(aptComplexes.govtComplexId))
    .limit(500);

  if (nullRows.length === 0) {
    return NextResponse.json({ message: "All complexes have govtComplexId", nullCount: 0 });
  }

  // For complexes with slug in "regionCode-aptSeq" format, derive govtComplexId from slug
  let updated = 0;
  for (const row of nullRows) {
    const match = row.slug.match(/^(\d{5})-(\d+)$/);
    if (match) {
      const govtId = row.slug; // slug IS the govtComplexId in this format
      try {
        await db.update(aptComplexes)
          .set({ govtComplexId: govtId })
          .where(eq(aptComplexes.id, row.id));
        updated++;
      } catch {
        // Unique constraint violation — skip duplicate
      }
    }
  }

  return NextResponse.json({
    message: "Backfill complete",
    totalNull: nullRows.length,
    updated,
    remaining: nullRows.length - updated,
  });
}
