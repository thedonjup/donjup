import { unstable_cache } from "next/cache";
import { asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { dailyReports } from "@/lib/db/schema";
import { pageOffset } from "@/lib/pagination";
import type { DailyReport } from "@/types/db";

const DAILY_REPORT_CACHE_REVALIDATE_SECONDS = 3600;
const DAILY_REPORT_CACHE_TAGS = [PUBLIC_DATA_CACHE_TAGS.DAILY_REPORTS];

export type DailyReportListItem = {
  id: string;
  report_date: string;
  title: string;
  summary: string | null;
};

export type DailyReportArchiveItem = DailyReportListItem & {
  top_drops: unknown;
  top_highs: unknown;
};

export type DailyReportPage<TReport> = {
  reports: TReport[];
  count: number;
};

export type DailyReportNavDates = {
  previousDate: string | null;
  nextDate: string | null;
};

export type DailyReportSitemapItem = {
  reportDate: string;
  createdAt: string | null;
};

type DailyReportDetailRow = Omit<DailyReport, "created_at"> & {
  created_at: Date | string | null;
};

function toIsoDateTime(value: Date | string | null): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function normalizeDailyReport(row: DailyReportDetailRow | undefined): DailyReport | null {
  if (!row) return null;

  return {
    ...row,
    created_at: toIsoDateTime(row.created_at) ?? "",
  };
}

export async function getDailyReportList(
  page: number,
  limit: number
): Promise<DailyReportPage<DailyReportListItem>> {
  const offset = pageOffset(page, limit);
  const [reports, countResult] = await Promise.all([
    db
      .select({
        id: dailyReports.id,
        report_date: dailyReports.reportDate,
        title: dailyReports.title,
        summary: dailyReports.summary,
      })
      .from(dailyReports)
      .orderBy(desc(dailyReports.reportDate))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(dailyReports),
  ]);

  return {
    reports,
    count: Number(countResult[0]?.count ?? 0),
  };
}

export async function getDailyReportArchivePage(
  page: number,
  limit: number
): Promise<DailyReportPage<DailyReportArchiveItem>> {
  const offset = pageOffset(page, limit);
  const [reports, countResult] = await Promise.all([
    db
      .select({
        id: dailyReports.id,
        report_date: dailyReports.reportDate,
        title: dailyReports.title,
        summary: dailyReports.summary,
        top_drops: dailyReports.topDrops,
        top_highs: dailyReports.topHighs,
      })
      .from(dailyReports)
      .orderBy(desc(dailyReports.reportDate))
      .offset(offset)
      .limit(limit),
    db.select({ count: sql<number>`count(*)` }).from(dailyReports),
  ]);

  return {
    reports,
    count: Number(countResult[0]?.count ?? 0),
  };
}

export async function getLatestDailyReport(): Promise<DailyReport | null> {
  const rows = await db
    .select({
      id: dailyReports.id,
      report_date: dailyReports.reportDate,
      title: dailyReports.title,
      summary: dailyReports.summary,
      top_drops: dailyReports.topDrops,
      top_highs: dailyReports.topHighs,
      rate_summary: dailyReports.rateSummary,
      volume_summary: dailyReports.volumeSummary,
      og_image_url: dailyReports.ogImageUrl,
      created_at: dailyReports.createdAt,
    })
    .from(dailyReports)
    .orderBy(desc(dailyReports.reportDate))
    .limit(1);

  return normalizeDailyReport(rows[0] as DailyReportDetailRow | undefined);
}

export async function getDailyReportByDate(date: string): Promise<DailyReport | null> {
  const rows = await db
    .select({
      id: dailyReports.id,
      report_date: dailyReports.reportDate,
      title: dailyReports.title,
      summary: dailyReports.summary,
      top_drops: dailyReports.topDrops,
      top_highs: dailyReports.topHighs,
      rate_summary: dailyReports.rateSummary,
      volume_summary: dailyReports.volumeSummary,
      og_image_url: dailyReports.ogImageUrl,
      created_at: dailyReports.createdAt,
    })
    .from(dailyReports)
    .where(eq(dailyReports.reportDate, date))
    .limit(1);

  return normalizeDailyReport(rows[0] as DailyReportDetailRow | undefined);
}

export async function getDailyReportNavDates(
  date: string
): Promise<DailyReportNavDates> {
  const [previousReport, nextReport] = await Promise.all([
    db
      .select({ reportDate: dailyReports.reportDate })
      .from(dailyReports)
      .where(lt(dailyReports.reportDate, date))
      .orderBy(desc(dailyReports.reportDate))
      .limit(1),
    db
      .select({ reportDate: dailyReports.reportDate })
      .from(dailyReports)
      .where(gt(dailyReports.reportDate, date))
      .orderBy(asc(dailyReports.reportDate))
      .limit(1),
  ]);

  return {
    previousDate: previousReport[0]?.reportDate ?? null,
    nextDate: nextReport[0]?.reportDate ?? null,
  };
}

export async function getDailyReportSitemapItems(
  limit: number
): Promise<DailyReportSitemapItem[]> {
  const reports = await db
    .select({
      reportDate: dailyReports.reportDate,
      createdAt: dailyReports.createdAt,
    })
    .from(dailyReports)
    .orderBy(desc(dailyReports.reportDate))
    .limit(limit);

  return reports.map((report) => ({
    reportDate: report.reportDate,
    createdAt: toIsoDateTime(report.createdAt),
  }));
}

export const getCachedDailyReportList = unstable_cache(
  getDailyReportList,
  ["daily-report-list-v1"],
  {
    revalidate: DAILY_REPORT_CACHE_REVALIDATE_SECONDS,
    tags: DAILY_REPORT_CACHE_TAGS,
  }
);

export const getCachedDailyReportArchivePage = unstable_cache(
  getDailyReportArchivePage,
  ["daily-report-archive-v1"],
  {
    revalidate: DAILY_REPORT_CACHE_REVALIDATE_SECONDS,
    tags: DAILY_REPORT_CACHE_TAGS,
  }
);

export const getCachedLatestDailyReport = unstable_cache(
  getLatestDailyReport,
  ["daily-report-latest-v1"],
  {
    revalidate: DAILY_REPORT_CACHE_REVALIDATE_SECONDS,
    tags: DAILY_REPORT_CACHE_TAGS,
  }
);

export const getCachedDailyReportByDate = unstable_cache(
  getDailyReportByDate,
  ["daily-report-by-date-v1"],
  {
    revalidate: DAILY_REPORT_CACHE_REVALIDATE_SECONDS,
    tags: DAILY_REPORT_CACHE_TAGS,
  }
);

export const getCachedDailyReportNavDates = unstable_cache(
  getDailyReportNavDates,
  ["daily-report-nav-v1"],
  {
    revalidate: DAILY_REPORT_CACHE_REVALIDATE_SECONDS,
    tags: DAILY_REPORT_CACHE_TAGS,
  }
);

export const getCachedDailyReportSitemapItems = unstable_cache(
  getDailyReportSitemapItems,
  ["daily-report-sitemap-v1"],
  {
    revalidate: DAILY_REPORT_CACHE_REVALIDATE_SECONDS,
    tags: DAILY_REPORT_CACHE_TAGS,
  }
);
