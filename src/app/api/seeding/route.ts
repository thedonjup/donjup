import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedingQueue } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const platform = searchParams.get("platform");

  try {
    const whereClause = platform
      ? and(
          eq(seedingQueue.reportDate, date),
          eq(seedingQueue.status, "pending"),
          eq(seedingQueue.platform, platform)
        )
      : and(
          eq(seedingQueue.reportDate, date),
          eq(seedingQueue.status, "pending")
        );

    const data = await db
      .select({
        id: seedingQueue.id,
        platform: seedingQueue.platform,
        title: seedingQueue.title,
        status: seedingQueue.status,
        report_date: seedingQueue.reportDate,
      })
      .from(seedingQueue)
      .where(whereClause)
      .orderBy(asc(seedingQueue.createdAt));

    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    logger.error("Failed to fetch seeding queue", { error: e, route: "/api/seeding" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
