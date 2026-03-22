import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchBuildingLedger } from "@/lib/api/building-ledger";
import { delay } from "@/lib/api/molit";

export const maxDuration = 300; // 5분 (Vercel Pro)

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // total_units 또는 parking_count가 없는 단지를 최대 100개 조회
  const { data: complexes, error: fetchError } = await supabase
    .from("apt_complexes")
    .select("id, region_code, apt_name")
    .or("total_units.is.null,parking_count.is.null")
    .limit(100);

  if (fetchError) {
    return NextResponse.json(
      { error: `DB 조회 실패: ${fetchError.message}` },
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

      const updateData: Record<string, unknown> = {};
      if (info.totalUnits) updateData.total_units = info.totalUnits;
      if (info.parkingCount) updateData.parking_count = info.parkingCount;
      if (info.heatingMethod) updateData.heating_method = info.heatingMethod;
      if (info.floorCount) updateData.floor_count = info.floorCount;

      if (Object.keys(updateData).length === 0) {
        await delay(300);
        continue;
      }

      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("apt_complexes")
        .update(updateData)
        .eq("id", complex.id);

      if (updateError) {
        errors.push(`${complex.apt_name}: ${updateError.message}`);
      } else {
        updated++;
      }

      await delay(300); // API 부하 방지
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${complex.apt_name}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    total: complexes.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
