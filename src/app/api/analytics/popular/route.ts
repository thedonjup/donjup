import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { getCachedPopularPages } from "@/lib/analytics-popular-query";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { parseBoundedPositiveInt } from "@/lib/pagination";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseBoundedPositiveInt(searchParams.get("days"), {
    defaultValue: 7,
    max: 90,
  });
  const limit = parseBoundedPositiveInt(searchParams.get("limit"), {
    defaultValue: 10,
    max: 50,
  });

  try {
    const data = await getCachedPopularPages(days, limit);

    return NextResponse.json(
      { data },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch popular pages", e, {
      route: "/api/analytics/popular",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
