import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  hasSearchFilters,
  normalizeSearchQuery,
  parsePropertyType,
  parseSearchFilters,
} from "@/lib/search-filters";
import { getCachedSearchResults } from "@/lib/search-query";
import { parseSearchSort } from "@/lib/search-sort";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = normalizeSearchQuery(searchParams.get("q"));
  const propertyType = parsePropertyType(searchParams.get("type"));
  const filters = parseSearchFilters(searchParams);
  const sort = parseSearchSort(searchParams.get("sort"));
  const hasFilters = hasSearchFilters(filters);

  if (q.length === 0 && !hasFilters) {
    return NextResponse.json(
      { results: [] },
      { headers: publicApiCacheHeaders() }
    );
  }

  try {
    const results = await getCachedSearchResults({
      query: q,
      propertyType,
      filters,
      sort,
    });

    return NextResponse.json(
      { results },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Search query failed", e, {
      route: "/api/search",
    });

    return NextResponse.json(
      {
        results: [],
        error: publicError.message,
        code: publicError.code,
      },
      { status: publicError.status }
    );
  }
}
