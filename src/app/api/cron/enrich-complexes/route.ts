import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { fetchBuildingLedger } from "@/lib/api/building-ledger";
import { delay } from "@/lib/api/molit";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 300; // 5분 (Vercel Pro)

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // total_units 또는 parking_count가 없는 단지를 최대 100개 조회
  let complexes;
  try {
    complexes = await db
      .select({
        id: aptComplexes.id,
        region_code: aptComplexes.regionCode,
        apt_name: aptComplexes.aptName,
      })
      .from(aptComplexes)
      .where(
        or(
          isNull(aptComplexes.totalUnits),
          isNull(aptComplexes.parkingCount),
          isNull(aptComplexes.floorAreaRatio),
          isNull(aptComplexes.elevatorCount)
        )
      )
      .limit(100);
  } catch (fetchError) {
    const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    logger.error("Enrich-complexes DB fetch failed", { error: fetchError, cron: "enrich-complexes" });
    await sendSlackAlert(`[enrich-complexes] DB 조회 실패: ${msg}`);
    return NextResponse.json(
      { error: `DB 조회 실패: ${msg}` },
      { status: 500 }
    );
  }

  if (!complexes || complexes.length === 0) {
    return NextResponse.json({ success: true, message: "보강할 단지 없음", updated: 0 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const complex of complexes) {
    try {
      const info = await fetchBuildingLedger(complex.region_code, complex.apt_name);

      if (!info) {
        await delay(300);
        continue;
      }

      const updateData: Partial<typeof aptComplexes.$inferInsert> = {};
      if (info.totalUnits) updateData.totalUnits = info.totalUnits;
      if (info.parkingCount) updateData.parkingCount = info.parkingCount;
      if (info.heatingMethod) updateData.heatingMethod = info.heatingMethod;
      if (info.floorCount) updateData.floorCount = info.floorCount;
      if (info.floorAreaRatio) updateData.floorAreaRatio = String(info.floorAreaRatio);
      if (info.buildingCoverage) updateData.buildingCoverage = String(info.buildingCoverage);
      if (info.energyGrade) updateData.energyGrade = info.energyGrade;
      if (info.elevatorCount) updateData.elevatorCount = info.elevatorCount;
      if (info.landArea) updateData.landArea = String(info.landArea);
      if (info.buildingArea) updateData.buildingArea = String(info.buildingArea);
      if (info.totalFloorArea) updateData.totalFloorArea = String(info.totalFloorArea);

      if (Object.keys(updateData).length === 0) {
        await delay(300);
        continue;
      }

      updateData.updatedAt = new Date();

      await db
        .update(aptComplexes)
        .set(updateData)
        .where(eq(aptComplexes.id, complex.id));

      updated++;

      await delay(300); // API 부하 방지
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${complex.apt_name}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    logger.error("Enrich-complexes had errors", { errorCount: errors.length, cron: "enrich-complexes" });
    await sendSlackAlert(`[enrich-complexes] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  return NextResponse.json({
    success: true,
    total: complexes.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
