import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { financeRates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { fetchAllRates } from "@/lib/api/ecos";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${rate.rateType}: ${msg}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
  }

  if (errors.length > 0) {
    logger.error("Fetch-rates had errors", { errorCount: errors.length, cron: "fetch-rates" });
    await sendSlackAlert(`[fetch-rates] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
