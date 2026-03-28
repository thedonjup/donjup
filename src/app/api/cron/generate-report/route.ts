import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptTransactions, financeRates, dailyReports } from "@/lib/db/schema";
import { eq, desc, asc, gte } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // 1. 폭락 TOP 10
    const topDrops = await db
      .select({
        id: aptTransactions.id,
        region_name: aptTransactions.regionName,
        apt_name: aptTransactions.aptName,
        size_sqm: aptTransactions.sizeSqm,
        trade_price: aptTransactions.tradePrice,
        highest_price: aptTransactions.highestPrice,
        change_rate: aptTransactions.changeRate,
        trade_date: aptTransactions.tradeDate,
      })
      .from(aptTransactions)
      .where(eq(aptTransactions.isSignificantDrop, true))
      .orderBy(asc(aptTransactions.changeRate))
      .limit(10);

    // 2. 신고가 TOP 10
    const topHighs = await db
      .select({
        id: aptTransactions.id,
        region_name: aptTransactions.regionName,
        apt_name: aptTransactions.aptName,
        size_sqm: aptTransactions.sizeSqm,
        trade_price: aptTransactions.tradePrice,
        highest_price: aptTransactions.highestPrice,
        change_rate: aptTransactions.changeRate,
        trade_date: aptTransactions.tradeDate,
      })
      .from(aptTransactions)
      .where(eq(aptTransactions.isNewHigh, true))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(10);

    // 3. 최신 금리 요약
    const latestRates = await db
      .select({
        rate_type: financeRates.rateType,
        rate_value: financeRates.rateValue,
        prev_value: financeRates.prevValue,
        change_bp: financeRates.changeBp,
        base_date: financeRates.baseDate,
      })
      .from(financeRates)
      .orderBy(desc(financeRates.baseDate))
      .limit(10);

    // 금리 타입별 최신 1건만
    const rateMap = new Map<string, typeof latestRates[number]>();
    for (const r of latestRates) {
      if (!rateMap.has(r.rate_type)) {
        rateMap.set(r.rate_type, r);
      }
    }
    const rateSummary = Array.from(rateMap.values());

    // 4. 거래량 요약 (최근 30일)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const volumeData = await db
      .select({ region_name: aptTransactions.regionName })
      .from(aptTransactions)
      .where(gte(aptTransactions.tradeDate, thirtyDaysAgo));

    // 지역별 거래 건수 집계
    const volumeMap = new Map<string, number>();
    for (const row of volumeData) {
      // region_name에서 구 이름만 추출 (예: "강남구 역삼동" → "강남구")
      const gu = row.region_name?.split(" ")[0] ?? "기타";
      volumeMap.set(gu, (volumeMap.get(gu) ?? 0) + 1);
    }

    const volumeSummary = Array.from(volumeMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. 리포트 제목 생성
    const topDrop = topDrops[0];
    const title = topDrop
      ? `${topDrop.apt_name} ${Math.abs(Number(topDrop.change_rate))}% 하락 외 | ${today} 돈줍 리포트`
      : `${today} 돈줍 데일리 리포트`;

    const summary = generateSummary(topDrops, topHighs, rateSummary, volumeSummary);

    // 6. daily_reports에 UPSERT
    await db.insert(dailyReports).values({
      reportDate: today,
      title,
      summary,
      topDrops,
      topHighs,
      rateSummary,
      volumeSummary,
    })
    .onConflictDoUpdate({
      target: dailyReports.reportDate,
      set: {
        title,
        summary,
        topDrops,
        topHighs,
        rateSummary,
        volumeSummary,
      },
    });

    // 7. 웹푸시 발송 트리거
    let pushResult: { pushSent?: number; pushFailed?: number } = {};
    try {
      const pushUrl = new URL("/api/cron/send-push", request.url);
      const pushRes = await fetch(pushUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });
      if (pushRes.ok) {
        pushResult = await pushRes.json();
      }
    } catch (pushErr) {
      logger.error("Generate-report push trigger failed", { error: pushErr, cron: "generate-report" });
    }

    return NextResponse.json({
      success: true,
      reportDate: today,
      title,
      stats: {
        drops: topDrops.length,
        highs: topHighs.length,
        rates: rateSummary.length,
        volumeRegions: volumeSummary.length,
      },
      push: pushResult,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("Generate-report failed", { error: e, cron: "generate-report" });
    await sendSlackAlert(`[generate-report] 실패: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function generateSummary(
  drops: unknown[] | null,
  highs: unknown[] | null,
  rates: unknown[],
  volume: { region: string; count: number }[]
): string {
  const parts: string[] = [];

  if (drops && drops.length > 0) {
    parts.push(`최고가 대비 폭락 거래 ${drops.length}건 포착`);
  }
  if (highs && highs.length > 0) {
    parts.push(`신고가 갱신 ${highs.length}건`);
  }
  if (rates.length > 0) {
    parts.push(`금리 지표 ${rates.length}종 업데이트`);
  }
  if (volume.length > 0) {
    parts.push(`거래량 Top: ${volume.slice(0, 3).map((v) => v.region).join(", ")}`);
  }

  return parts.join(" | ");
}
