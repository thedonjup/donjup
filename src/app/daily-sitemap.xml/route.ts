import { getCachedDailyReportSitemapItems } from "@/lib/daily-report-query";
import { logDatabaseFailure } from "@/lib/db/logging";
import { createSitemapUrlSetXml, SITEMAP_XML_CONTENT_TYPE } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE_URL = "https://donjup.com";
const MAX_DAILY_REPORT_SITEMAP_ITEMS = 1000;

export async function GET(): Promise<Response> {
  try {
    const reports = await getCachedDailyReportSitemapItems(MAX_DAILY_REPORT_SITEMAP_ITEMS);
    const sitemapXml = createSitemapUrlSetXml(
      reports.map((report) => ({
        url: `${BASE_URL}/daily/${report.reportDate}`,
        lastModified: report.createdAt ?? report.reportDate,
        changeFrequency: "monthly",
        priority: 0.65,
      }))
    );

    return new Response(sitemapXml, {
      headers: {
        "Content-Type": SITEMAP_XML_CONTENT_TYPE,
      },
    });
  } catch (error) {
    logDatabaseFailure("Daily sitemap XML route query failed", error, {
      route: "/daily-sitemap.xml",
    });

    return new Response(createSitemapUrlSetXml([]), {
      headers: {
        "Content-Type": SITEMAP_XML_CONTENT_TYPE,
      },
    });
  }
}
