import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = createServiceClient();

    const [nullHighest, nullGeo, totalComplexes, totalTx] = await Promise.allSettled([
      db.from("apt_complexes").select("id", { count: "exact", head: true }).is("highest_price", null),
      db.from("apt_complexes").select("id", { count: "exact", head: true }).is("lat", null),
      db.from("apt_complexes").select("id", { count: "exact", head: true }),
      db.from("apt_transactions").select("id", { count: "exact", head: true }),
    ]);

    const nullHighestCount = nullHighest.status === "fulfilled" ? (nullHighest.value.count ?? 0) : 0;
    const nullGeoCount = nullGeo.status === "fulfilled" ? (nullGeo.value.count ?? 0) : 0;
    const totalCx = totalComplexes.status === "fulfilled" ? (totalComplexes.value.count ?? 0) : 0;
    const totalTxCount = totalTx.status === "fulfilled" ? (totalTx.value.count ?? 0) : 0;

    return NextResponse.json({
      checks: [
        {
          label: "highest_price NULL",
          description: "최고가 정보가 없는 단지 수",
          count: nullHighestCount,
          severity: nullHighestCount > 100 ? "error" : nullHighestCount > 0 ? "warn" : "ok",
        },
        {
          label: "좌표 정보 누락",
          description: "위도/경도가 없는 단지 수",
          count: nullGeoCount,
          severity: nullGeoCount > 100 ? "error" : nullGeoCount > 0 ? "warn" : "ok",
        },
        {
          label: "총 등록 단지",
          description: "complexes 테이블 전체 행 수",
          count: totalCx,
          severity: "ok",
        },
        {
          label: "총 거래 건수",
          description: "transactions 테이블 전체 행 수",
          count: totalTxCount,
          severity: "ok",
        },
      ],
    });
  } catch {
    return NextResponse.json({ checks: [] });
  }
}
