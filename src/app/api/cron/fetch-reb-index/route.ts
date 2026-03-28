import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rebPriceIndices } from "@/lib/db/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import { fetchAllIndices } from "@/lib/api/reb";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 120;

/**
 * 한국부동산원 아파트 매매/전세 가격지수 수집 크론
 * 주간 실행 (가격지수는 월별 업데이트)
 */
export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];
  let inserted = 0;

  try {
    // 최근 2개월 범위로 조회 (월별 데이터이므로)
    const now = new Date();
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startDate = `${twoMonthsAgo.getFullYear()}${String(twoMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
    const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const indices = await fetchAllIndices(startDate, endDate);

    for (const item of indices) {
      // 이전 값 조회 (변동률 보완)
      let prevValue = item.prevValue;
      let changeRate = item.changeRate;

      if (prevValue === null) {
        const prevRows = await db
          .select({ index_value: rebPriceIndices.indexValue })
          .from(rebPriceIndices)
          .where(
            and(
              eq(rebPriceIndices.indexType, item.indexType),
              eq(rebPriceIndices.regionName, item.regionName),
              lt(rebPriceIndices.baseDate, item.baseDate)
            )
          )
          .orderBy(desc(rebPriceIndices.baseDate))
          .limit(1);

        if (prevRows[0]) {
          prevValue = Number(prevRows[0].index_value);
          changeRate =
            prevValue !== null && prevValue !== 0
              ? Math.round(((item.indexValue - prevValue) / prevValue) * 10000) / 100
              : null;
        }
      }

      try {
        await db.insert(rebPriceIndices).values({
          indexType: item.indexType,
          regionName: item.regionName,
          indexValue: String(item.indexValue),
          baseDate: item.baseDate,
          prevValue: prevValue !== null ? String(prevValue) : null,
          changeRate: changeRate !== null ? String(changeRate) : null,
        })
        .onConflictDoUpdate({
          target: [rebPriceIndices.indexType, rebPriceIndices.regionName, rebPriceIndices.baseDate],
          set: {
            indexValue: String(item.indexValue),
            prevValue: prevValue !== null ? String(prevValue) : null,
            changeRate: changeRate !== null ? String(changeRate) : null,
          },
        });
        inserted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${item.regionName}/${item.indexType}: ${msg}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
  }

  if (errors.length > 0) {
    logger.error("Fetch-reb-index had errors", { errorCount: errors.length, cron: "fetch-reb-index" });
    await sendSlackAlert(`[fetch-reb-index] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
