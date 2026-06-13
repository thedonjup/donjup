import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { getCachedAptComplexList } from "@/lib/apt-list-query";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  parseBoundedPositiveInt,
  parsePositivePage,
} from "@/lib/pagination";
import { parseSigunguRegionCode } from "@/lib/region-filter";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionParam = searchParams.get("region");
  const region = parseSigunguRegionCode(regionParam);
  const page = parsePositivePage(searchParams.get("page"));
  const limit = parseBoundedPositiveInt(searchParams.get("limit"), {
    defaultValue: 20,
    max: 50,
  });

  if (regionParam?.trim() && !region) {
    return NextResponse.json({ error: "Invalid region code" }, { status: 400 });
  }

  try {
    const result = await getCachedAptComplexList(region, page, limit);

    return NextResponse.json(
      result,
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch apt complexes", e, {
      route: "/api/apt",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
