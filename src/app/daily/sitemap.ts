import type { MetadataRoute } from "next";
import { getCachedDailyReportSitemapItems } from "@/lib/daily-report-query";
import { logDatabaseFailure } from "@/lib/db/logging";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const MAX_DAILY_REPORT_SITEMAP_ITEMS = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://donjup.com";

  try {
    const reports = await getCachedDailyReportSitemapItems(MAX_DAILY_REPORT_SITEMAP_ITEMS);

    return reports.map((report) => ({
      url: `${baseUrl}/daily/${report.reportDate}`,
      lastModified: report.createdAt ?? report.reportDate,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));
  } catch (error) {
    logDatabaseFailure("Daily sitemap query failed", error, {
      route: "/daily/sitemap",
    });
    return [];
  }
}
