import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { getCachedDailyReportList } from "@/lib/daily-report-query";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  parseBoundedPositiveInt,
  parsePositivePage,
} from "@/lib/pagination";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parsePositivePage(searchParams.get("page"));
  const limit = parseBoundedPositiveInt(searchParams.get("limit"), {
    defaultValue: 20,
    max: 50,
  });

  try {
    const { reports: data, count } = await getCachedDailyReportList(page, limit);

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch daily reports", e, {
      route: "/api/daily",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
