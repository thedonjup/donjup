import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";
import { isNull, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [nullGeo, totalComplexes, totalTx] = await Promise.allSettled([
      db
        .select({ count: sql<number>`count(*)` })
        .from(aptComplexes)
        .where(isNull(aptComplexes.latitude)),
      db.select({ count: sql<number>`count(*)` }).from(aptComplexes),
      db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
    ]);

    const nullGeoCount = nullGeo.status === "fulfilled" ? Number(nullGeo.value[0]?.count ?? 0) : 0;
    const totalCx = totalComplexes.status === "fulfilled" ? Number(totalComplexes.value[0]?.count ?? 0) : 0;
    const totalTxCount = totalTx.status === "fulfilled" ? Number(totalTx.value[0]?.count ?? 0) : 0;

    return NextResponse.json({
      checks: [
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
