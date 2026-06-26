import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { getCachedDailyReportList } from "@/lib/daily-report-query";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  createCoreFeedItems,
  createRssFeed,
  RSS_XML_CONTENT_TYPE,
  type RssFeedItem,
} from "@/lib/rss-feed";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE_URL = "https://donjup.com";
const DAILY_REPORT_FEED_LIMIT = 30;

function dailyReportFeedItem(report: {
  report_date: string;
  title: string;
  summary: string | null;
}): RssFeedItem {
  return {
    title: report.title,
    url: `${BASE_URL}/daily/${report.report_date}`,
    description: report.summary ?? `${report.report_date} 돈줍 데일리 부동산 리포트`,
    pubDate: report.report_date,
  };
}

export async function GET(): Promise<Response> {
  let reportItems: RssFeedItem[] = [];

  try {
    const { reports } = await getCachedDailyReportList(1, DAILY_REPORT_FEED_LIMIT);
    reportItems = reports.map(dailyReportFeedItem);
  } catch (error) {
    logDatabaseFailure("RSS feed route daily report query failed", error, {
      route: "/feed.xml",
    });
  }

  const feedXml = createRssFeed({
    baseUrl: BASE_URL,
    items: [...createCoreFeedItems(BASE_URL), ...reportItems],
  });

  return new Response(feedXml, {
    headers: {
      "Content-Type": RSS_XML_CONTENT_TYPE,
      ...publicApiCacheHeaders({
        sharedMaxAge: 3600,
        staleWhileRevalidate: 86400,
      }),
    },
  });
}
