import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { getCachedLatestBankRates } from "@/lib/finance-rate-api-query";

export async function GET() {
  try {
    const { rates, minRate } = await getCachedLatestBankRates();

    return NextResponse.json(
      { rates, minRate },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch bank rates", e, {
      route: "/api/bank-rates",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
