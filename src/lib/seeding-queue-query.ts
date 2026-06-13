import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seedingQueue } from "@/lib/db/schema";
import type { SeedingPlatform } from "@/lib/seeding-query";

export type PendingSeedingQueueQuery = {
  date: string;
  platform: SeedingPlatform | null;
  limit: number;
};

export type PendingSeedingQueueItem = {
  id: string;
  platform: string;
  title: string;
  status: string;
  report_date: string;
};

export type PendingSeedingQueueResponse = {
  data: PendingSeedingQueueItem[];
  count: number;
  date: string;
  platform: SeedingPlatform | null;
};

export async function getPendingSeedingQueue(
  query: PendingSeedingQueueQuery
): Promise<PendingSeedingQueueResponse> {
  const whereClause = query.platform
    ? and(
        eq(seedingQueue.reportDate, query.date),
        eq(seedingQueue.status, "pending"),
        eq(seedingQueue.platform, query.platform)
      )
    : and(
        eq(seedingQueue.reportDate, query.date),
        eq(seedingQueue.status, "pending")
      );

  const data = await db
    .select({
      id: seedingQueue.id,
      platform: seedingQueue.platform,
      title: seedingQueue.title,
      status: seedingQueue.status,
      report_date: seedingQueue.reportDate,
    })
    .from(seedingQueue)
    .where(whereClause)
    .orderBy(asc(seedingQueue.createdAt))
    .limit(query.limit);

  return {
    data,
    count: data.length,
    date: query.date,
    platform: query.platform,
  };
}
