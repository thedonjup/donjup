import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/db/schema";

export async function recordPageview(
  pagePath: string,
  pageType: string,
  viewDate = new Date().toISOString().split("T")[0] ?? "",
  viewCount = 1
): Promise<void> {
  const normalizedViewCount = Math.max(1, Math.floor(viewCount));

  await db
    .insert(pageViews)
    .values({
      pagePath,
      pageType,
      viewDate,
      viewCount: normalizedViewCount,
    })
    .onConflictDoUpdate({
      target: [pageViews.pagePath, pageViews.viewDate],
      set: {
        viewCount: sql`${pageViews.viewCount} + ${normalizedViewCount}`,
      },
    });
}
