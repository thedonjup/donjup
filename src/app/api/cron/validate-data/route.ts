import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { eq, isNull, lte, not, or, gt, lt, sql } from "drizzle-orm";
import { sendSlackAlert } from "@/lib/alert";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5분

const MAX_NULL_RECORDS = 500;

type DropLevel = "normal" | "decline" | "crash" | "severe";

function calcDropLevel(changeRate: number | null): DropLevel {
  if (changeRate === null) return "normal";
  if (changeRate <= -25) return "severe";
  if (changeRate <= -15) return "crash";
  if (changeRate <= -10) return "decline";
  return "normal";
}

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const results: Record<string, unknown> = {};

  // ─── 1. NULL highest_price 건수 확인 ───
  const nullHighestResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(aptTransactions)
    .where(isNull(aptTransactions.highestPrice));

  const nullHighestCount = Number(nullHighestResult[0]?.count ?? 0);
  results.nullHighestCount = nullHighestCount;
  log.push(`NULL highest_price: ${nullHighestCount}건`);

  // ─── 2. NULL highest_price 자동 재계산 (최대 500건의 그룹) ───
  let recalculated = 0;
  if (nullHighestCount > 0) {
    // NULL이 있는 그룹 식별 (최대 500건 처리를 위해 그룹 단위로 조회)
    const nullGroups = await db
      .select({
        apt_name: aptTransactions.aptName,
        size_sqm: aptTransactions.sizeSqm,
      })
      .from(aptTransactions)
      .where(isNull(aptTransactions.highestPrice))
      .limit(MAX_NULL_RECORDS);

    // 유니크 그룹 추출
    const uniqueGroups = new Map<string, { aptName: string; sizeSqm: string }>();
    for (const row of nullGroups) {
      const key = `${row.apt_name}||${row.size_sqm}`;
      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, { aptName: row.apt_name, sizeSqm: String(row.size_sqm) });
      }
    }

    log.push(`재계산 대상 그룹: ${uniqueGroups.size}개`);

    // 각 그룹별로 전체 거래를 시간순으로 조회 후 재계산
    for (const [, group] of uniqueGroups) {
      const transactions = await db
        .select({
          id: aptTransactions.id,
          trade_price: aptTransactions.tradePrice,
          trade_date: aptTransactions.tradeDate,
        })
        .from(aptTransactions)
        .where(eq(aptTransactions.aptName, group.aptName))
        .orderBy(aptTransactions.tradeDate, aptTransactions.id);

      if (!transactions || transactions.length === 0) continue;

      let runningMax = 0;

      for (const t of transactions) {
        let highestPrice: number;
        let changeRate: number | null = null;
        let isNewHigh = false;
        let isSignificantDrop = false;

        if (runningMax === 0) {
          // 첫 거래
          highestPrice = t.trade_price;
        } else if (t.trade_price > runningMax) {
          // 신고가 갱신
          highestPrice = t.trade_price;
          isNewHigh = true;
        } else {
          // 최고가 이하 거래
          highestPrice = runningMax;
          changeRate = parseFloat(
            (((t.trade_price - runningMax) / runningMax) * 100).toFixed(2)
          );
          isSignificantDrop = changeRate <= -15;
        }

        runningMax = Math.max(runningMax, t.trade_price);
        const dropLevel = calcDropLevel(changeRate);

        await db
          .update(aptTransactions)
          .set({
            highestPrice,
            changeRate: changeRate !== null ? String(changeRate) : null,
            isNewHigh,
            isSignificantDrop,
            dropLevel,
          })
          .where(eq(aptTransactions.id, t.id));

        recalculated++;
      }
    }

    log.push(`재계산 완료: ${recalculated}건`);
  }
  results.recalculated = recalculated;

  // ─── 3. 이상치 탐지 (같은 단지+면적에서 직전 거래 대비 10배 이상) ───
  const anomalyResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(aptTransactions)
    .where(
      or(
        gt(aptTransactions.changeRate, "900"),
        lt(aptTransactions.changeRate, "-95")
      )
    );

  const anomalyCount = Number(anomalyResult[0]?.count ?? 0);
  results.anomalyCount = anomalyCount;
  log.push(`이상치 의심 건수: ${anomalyCount}건`);

  // ─── 4. 유효하지 않은 가격 확인 ───
  const invalidPriceResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(aptTransactions)
    .where(lte(aptTransactions.tradePrice, 0));

  const invalidPriceCount = Number(invalidPriceResult[0]?.count ?? 0);
  results.invalidPriceCount = invalidPriceCount;
  log.push(`유효하지 않은 가격: ${invalidPriceCount}건`);

  // ─── 5. 폭락 플래그 불일치 확인 ───
  const flagMismatchResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(aptTransactions)
    .where(
      sql`${aptTransactions.isSignificantDrop} = true AND (${aptTransactions.changeRate} IS NULL OR ${aptTransactions.changeRate} > -15)`
    );

  const flagMismatchCount = Number(flagMismatchResult[0]?.count ?? 0);
  results.flagMismatchCount = flagMismatchCount;
  log.push(`폭락 플래그 불일치: ${flagMismatchCount}건`);

  // ─── 6. 변동률 범위 초과 확인 ───
  const outOfRangeResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(aptTransactions)
    .where(
      or(
        lt(aptTransactions.changeRate, "-100"),
        gt(aptTransactions.changeRate, "1000")
      )
    );

  const outOfRangeCount = Number(outOfRangeResult[0]?.count ?? 0);
  results.outOfRangeCount = outOfRangeCount;
  log.push(`변동률 범위 초과: ${outOfRangeCount}건`);

  // Slack alert on anomalies
  const totalAnomalies = anomalyCount + invalidPriceCount + flagMismatchCount + outOfRangeCount;
  if (totalAnomalies > 0) {
    await sendSlackAlert(
      `데이터 검증 이상 발견: 이상치 ${anomalyCount}건, 유효하지 않은 가격 ${invalidPriceCount}건, 플래그 불일치 ${flagMismatchCount}건, 범위 초과 ${outOfRangeCount}건`
    );
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    log,
    ...results,
  });
}
