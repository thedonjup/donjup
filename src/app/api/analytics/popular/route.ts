import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/db/schema";
import { gte, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const data = await db
      .select({
        page_path: pageViews.pagePath,
        page_type: pageViews.pageType,
        view_count: pageViews.viewCount,
      })
      .from(pageViews)
      .where(gte(pageViews.viewDate, startDate.toISOString().split("T")[0]))
      .orderBy(desc(pageViews.viewCount))
      .limit(limit);

    return NextResponse.json({ data });
  } catch (e) {
    logger.error("Failed to fetch popular pages", { error: e, route: "/api/analytics/popular" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
