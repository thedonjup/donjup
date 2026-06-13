import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { getCachedNewsSearchResults } from "@/lib/news-query";
import { parseBoundedTextQuery } from "@/lib/public-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseBoundedTextQuery(searchParams.get("q"), {
    minLength: 2,
    maxLength: 80,
  });

  if (!query) {
    return NextResponse.json(
      { error: "Invalid query" },
      { status: 400 }
    );
  }

  try {
    const items = await getCachedNewsSearchResults(query);

    return NextResponse.json(
      items,
      { headers: publicApiCacheHeaders() }
    );
  } catch {
    return NextResponse.json(
      [],
      { status: 200, headers: publicApiCacheHeaders() }
    );
  }
}
