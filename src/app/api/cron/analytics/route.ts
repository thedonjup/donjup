import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyticsDaily } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];

  try {
    // GA4 분석 데이터 수집
    // Google Analytics Data API (GA4) 사용
    const propertyId = process.env.GA4_PROPERTY_ID;

    if (!propertyId) {
      return NextResponse.json({
        success: false,
        message: "GA4_PROPERTY_ID 환경변수가 설정되지 않았습니다.",
      }, { status: 400 });
    }

    // analytics_daily 테이블 확보 (DDL — use db.execute with sql template)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analytics_daily (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        page_views INT DEFAULT 0,
        sessions INT DEFAULT 0,
        users INT DEFAULT 0,
        new_users INT DEFAULT 0,
        avg_session_duration NUMERIC(10,2) DEFAULT 0,
        bounce_rate NUMERIC(5,2) DEFAULT 0,
        top_pages JSONB,
        top_referrers JSONB,
        collected_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (date)
      )
    `);

    // page_views 테이블에서 자체 분석 데이터 집계 (GA API 없이도 동작)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    // page_views에서 어제 통계 집계 (complex aggregate — use db.execute)
    const pvResult = await db.execute(sql`
      SELECT
        COUNT(*) as page_views,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(DISTINCT visitor_id) as users
      FROM page_views
      WHERE viewed_at::date = ${dateStr}
    `);

    const stats = (pvResult.rows[0] as { page_views: string; sessions: string; users: string }) || { page_views: "0", sessions: "0", users: "0" };

    // 인기 페이지 TOP 10
    const topPagesResult = await db.execute(sql`
      SELECT page_path, COUNT(*) as views
      FROM page_views
      WHERE viewed_at::date = ${dateStr}
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 10
    `);

    // 인기 유입처 TOP 10
    const topReferrersResult = await db.execute(sql`
      SELECT referrer, COUNT(*) as visits
      FROM page_views
      WHERE viewed_at::date = ${dateStr} AND referrer IS NOT NULL AND referrer != ''
      GROUP BY referrer
      ORDER BY visits DESC
      LIMIT 10
    `);

    await db
      .insert(analyticsDaily)
      .values({
        date: dateStr,
        pageViews: parseInt(String(stats.page_views)) || 0,
        sessions: parseInt(String(stats.sessions)) || 0,
        users: parseInt(String(stats.users)) || 0,
        topPages: topPagesResult.rows,
        topReferrers: topReferrersResult.rows,
      })
      .onConflictDoUpdate({
        target: analyticsDaily.date,
        set: {
          pageViews: parseInt(String(stats.page_views)) || 0,
          sessions: parseInt(String(stats.sessions)) || 0,
          users: parseInt(String(stats.users)) || 0,
          topPages: topPagesResult.rows,
          topReferrers: topReferrersResult.rows,
          collectedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      message: `${dateStr} 분석 데이터 집계 완료 — PV: ${stats.page_views}, 세션: ${stats.sessions}, 사용자: ${stats.users}`,
      date: dateStr,
      stats: {
        page_views: parseInt(String(stats.page_views)) || 0,
        sessions: parseInt(String(stats.sessions)) || 0,
        users: parseInt(String(stats.users)) || 0,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
    logger.error("Analytics cron failed", { error: e, cron: "analytics" });
    await sendSlackAlert(`[analytics] 실패: ${msg}`);
    return NextResponse.json({
      success: false,
      message: "분석 데이터 수집 실패",
      errors,
    }, { status: 500 });
  }
}
