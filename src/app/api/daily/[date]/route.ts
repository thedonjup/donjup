import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import {
  getCachedDailyReportByDate,
  getCachedLatestDailyReport,
} from "@/lib/daily-report-query";
import { parseDailyReportApiDate } from "@/lib/daily-report-nav";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date: rawDate } = await params;
  const date = parseDailyReportApiDate(rawDate);

  if (!date) {
    return NextResponse.json({ error: "Invalid report date" }, { status: 400 });
  }

  try {
    const report = date === "latest"
      ? await getCachedLatestDailyReport()
      : await getCachedDailyReportByDate(date);

    if (!report) {
      return NextResponse.json({ error: "해당 날짜 리포트가 없습니다." }, { status: 404 });
    }

    return NextResponse.json(
      { data: report },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch daily report", e, {
      route: "/api/daily/[date]",
      date,
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
