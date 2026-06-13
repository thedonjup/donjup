import { NextRequest, NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  parseAptExtremesLimit,
  parseAptExtremeType,
} from "@/lib/apt-extremes-params";
import { getCachedAptExtremeTransactions } from "@/lib/apt-extremes-query";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = parseAptExtremeType(searchParams.get("type"));
  const limit = parseAptExtremesLimit(searchParams.get("limit"));

  if (!type) {
    return NextResponse.json({ error: "Invalid extreme type" }, { status: 400 });
  }

  try {
    const data = await getCachedAptExtremeTransactions(type, limit);

    return NextResponse.json(
      { type, data },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch extremes", e, {
      route: "/api/apt/extremes",
      type,
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
