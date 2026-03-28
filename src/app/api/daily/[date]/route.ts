import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyReports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  // "latest"이면 가장 최근 리포트
  if (date === "latest") {
    const rows = await db
      .select()
      .from(dailyReports)
      .orderBy(desc(dailyReports.reportDate))
      .limit(1);

    if (!rows[0]) {
      return NextResponse.json({ error: "리포트가 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ data: rows[0] });
  }

  // 날짜로 조회
  const rows = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.reportDate, date))
    .limit(1);

  if (!rows[0]) {
    return NextResponse.json({ error: "해당 날짜 리포트가 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ data: rows[0] });
}
