import { unstable_cache } from "next/cache";
import { desc, gte, sql } from "drizzle-orm";
import { pageviewStartDate } from "@/lib/analytics-popular";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/db/schema";

export type PopularPageItem = {
  page_path: string;
  page_type: string | null;
  view_count: number;
};

export async function getPopularPages(
  days: number,
  limit: number
): Promise<PopularPageItem[]> {
  const startDate = pageviewStartDate(days);
  const viewCount = sql<number>`COALESCE(SUM(${pageViews.viewCount}), 0)::int`;

  return db
    .select({
      page_path: pageViews.pagePath,
      page_type: pageViews.pageType,
      view_count: viewCount,
    })
    .from(pageViews)
    .where(gte(pageViews.viewDate, startDate))
    .groupBy(pageViews.pagePath, pageViews.pageType)
    .orderBy(desc(viewCount))
    .limit(limit);
}

export const getCachedPopularPages = unstable_cache(
  getPopularPages,
  ["popular-pages-v1"],
  {
    revalidate: 300,
    tags: [PUBLIC_DATA_CACHE_TAGS.PAGE_VIEWS],
  }
);
