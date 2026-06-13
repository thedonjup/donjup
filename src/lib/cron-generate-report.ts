import { asc, desc, eq, gte } from "drizzle-orm";
import { revalidatePublicDataCaches } from "@/lib/cache-revalidation";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { aptTransactions, dailyReports, financeRates } from "@/lib/db/schema";
import { formatKstDate, formatKstDateDaysAgo } from "@/lib/kst-date";
import { logger } from "@/lib/logger";

type PushResult = {
  pushSent?: number;
  pushFailed?: number;
};

type VolumeSummary = {
  region: string;
  count: number;
};

type GenerateDailyReportOptions = {
  requestUrl: string;
  now?: Date;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
};

export function getKstReportDate(now: Date = new Date()): string {
  return formatKstDate(now);
}

export function getKstReportWindowStartDate(now: Date = new Date()): string {
  return formatKstDateDaysAgo(30, now);
}

export function generateSummary(
  drops: unknown[] | null,
  highs: unknown[] | null,
  rates: unknown[],
  volume: VolumeSummary[]
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

async function triggerDailyReportPush({
  requestUrl,
  fetchImpl,
  env,
}: Required<Pick<GenerateDailyReportOptions, "requestUrl" | "fetchImpl" | "env">>): Promise<PushResult> {
  const cronSecret = env.CRON_SECRET;
  if (!cronSecret) {
    logger.warn("Generate-report skipped push trigger because CRON_SECRET is missing", {
      cron: "generate-report",
    });
    return {};
  }

  try {
    const pushUrl = new URL("/api/cron/send-push", requestUrl);
    const pushRes = await fetchImpl(pushUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    if (!pushRes.ok) {
      return {};
    }

    return await pushRes.json();
  } catch (pushErr) {
    logger.error("Generate-report push trigger failed", {
      error: pushErr,
      cron: "generate-report",
    });
    return {};
  }
}

export async function generateDailyReport({
  requestUrl,
  now = new Date(),
  fetchImpl = fetch,
  env = process.env,
}: GenerateDailyReportOptions) {
  const today = getKstReportDate(now);

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

  const rateMap = new Map<string, typeof latestRates[number]>();
  for (const rate of latestRates) {
    if (!rateMap.has(rate.rate_type)) {
      rateMap.set(rate.rate_type, rate);
    }
  }
  const rateSummary = Array.from(rateMap.values());

  const volumeData = await db
    .select({ region_name: aptTransactions.regionName })
    .from(aptTransactions)
    .where(gte(aptTransactions.tradeDate, getKstReportWindowStartDate(now)));

  const volumeMap = new Map<string, number>();
  for (const row of volumeData) {
    const region = row.region_name?.split(" ")[0] ?? "기타";
    volumeMap.set(region, (volumeMap.get(region) ?? 0) + 1);
  }

  const volumeSummary = Array.from(volumeMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topDrop = topDrops[0];
  const title = topDrop
    ? `${topDrop.apt_name} ${Math.abs(Number(topDrop.change_rate))}% 하락 외 | ${today} 돈줍 리포트`
    : `${today} 돈줍 데일리 리포트`;
  const summary = generateSummary(topDrops, topHighs, rateSummary, volumeSummary);

  await db
    .insert(dailyReports)
    .values({
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

  const cacheRevalidation = revalidatePublicDataCaches(
    [PUBLIC_DATA_CACHE_TAGS.DAILY_REPORTS],
    { cron: "generate-report", reportDate: today }
  );

  const push = await triggerDailyReportPush({
    requestUrl,
    fetchImpl,
    env,
  });

  return {
    success: true,
    reportDate: today,
    title,
    stats: {
      drops: topDrops.length,
      highs: topHighs.length,
      rates: rateSummary.length,
      volumeRegions: volumeSummary.length,
    },
    push,
    cacheRevalidation,
  };
}
