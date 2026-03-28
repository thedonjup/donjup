import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { pagePath, pageType } = await request.json();

    if (!pagePath) {
      return NextResponse.json(
        { error: "pagePath는 필수입니다." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    try {
      await db
        .insert(pageViews)
        .values({
          pagePath,
          pageType: pageType || null,
          viewDate: today,
          viewCount: 1,
        })
        .onConflictDoUpdate({
          target: [pageViews.pagePath, pageViews.viewDate],
          set: {
            viewCount: sql`${pageViews.viewCount} + 1`,
          },
        });
    } catch (e) {
      // page_views upsert 실패 시에도 200 반환 (분석은 best-effort)
      logger.warn("Failed to track page view", { error: e, route: "/api/analytics/pageview" });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "요청을 처리할 수 없습니다." },
      { status: 400 }
    );
  }
}
