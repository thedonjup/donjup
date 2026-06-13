import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { getCachedRateHistory } from "@/lib/finance-rate-api-query";
import {
  parseFinanceRateType,
  parseRateHistoryMonths,
} from "@/lib/rate-history-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rateTypeParam = searchParams.get("type");
  const rateType = parseFinanceRateType(rateTypeParam);
  const months = parseRateHistoryMonths(searchParams.get("months"));

  if (rateTypeParam?.trim() && !rateType) {
    return NextResponse.json({ error: "Invalid rate type" }, { status: 400 });
  }

  try {
    const rates = await getCachedRateHistory(rateType, months);

    return NextResponse.json(
      { data: rates },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch rate history", e, {
      route: "/api/rate/history",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
