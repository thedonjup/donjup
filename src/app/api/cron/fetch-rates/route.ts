import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { fetchAllRates } from "@/lib/api/ecos";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import { safeErrorListItem, safeErrorMessage } from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { revalidatePublicDataCaches } from "@/lib/cache-revalidation";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Cron 인증
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("fetch-rates");
  if (databaseUnavailable) return databaseUnavailable;

  const errors: string[] = [];
  let inserted = 0;

  try {
    const rates = await fetchAllRates();

    for (const rate of rates) {
      // 이전 값 조회 (변동폭 계산)
      const prevRows = await db
        .select({ rate_value: financeRates.rateValue })
        .from(financeRates)
        .where(eq(financeRates.rateType, rate.rateType))
        .orderBy(desc(financeRates.baseDate))
        .limit(1);

      const prevValue = prevRows[0] ? Number(prevRows[0].rate_value) : null;
      const changeBp = prevValue !== null
        ? Math.round((rate.rateValue - prevValue) * 100)
        : null;

      try {
        await db.insert(financeRates).values({
          rateType: rate.rateType,
          rateValue: String(rate.rateValue),
          prevValue: prevValue !== null ? String(prevValue) : null,
          changeBp,
          baseDate: rate.baseDate,
          source: rate.source,
        })
        .onConflictDoUpdate({
          target: [financeRates.rateType, financeRates.baseDate],
          set: {
            rateValue: String(rate.rateValue),
            prevValue: prevValue !== null ? String(prevValue) : null,
            changeBp,
          },
        });
        inserted++;
      } catch (e) {
        errors.push(safeErrorListItem(rate.rateType, e));
      }
    }
  } catch (e) {
    errors.push(safeErrorMessage(e));
  }

  if (errors.length > 0) {
    logger.error("Fetch-rates had errors", { errorCount: errors.length, cron: "fetch-rates" });
    await sendSlackAlert(`[fetch-rates] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  const cacheRevalidation = inserted > 0
    ? revalidatePublicDataCaches(
        [PUBLIC_DATA_CACHE_TAGS.FINANCE_RATES],
        {
          route: "/api/cron/fetch-rates",
          inserted,
        }
      )
    : undefined;

  return NextResponse.json({
    success: errors.length === 0,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
    cacheRevalidation,
  });
}
