import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyReports } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = (page - 1) * limit;

  try {
    const [data, countResult] = await Promise.all([
      db
        .select({
          id: dailyReports.id,
          report_date: dailyReports.reportDate,
          title: dailyReports.title,
          summary: dailyReports.summary,
        })
        .from(dailyReports)
        .orderBy(desc(dailyReports.reportDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(dailyReports),
    ]);

    const count = Number(countResult[0]?.count ?? 0);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (e) {
    logger.error("Failed to fetch daily reports", { error: e, route: "/api/daily" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
