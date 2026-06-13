import { and, desc, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentQueue } from "@/lib/db/schema";
import type {
  ContentStatus,
  ContentTab,
} from "@/lib/dam-content-request";

export type DamContentItem = {
  id: string;
  title: string | null;
  status: string;
  platform: string | null;
  created_at: Date | null;
  content_type: string;
};

function contentWhereClause(tab: ContentTab) {
  if (tab === "cardnews") {
    return like(contentQueue.contentType, "cardnews_%");
  }

  if (tab === "seeding") {
    return eq(contentQueue.contentType, "seeding");
  }

  return and(
    like(contentQueue.contentType, "cardnews_%"),
    eq(contentQueue.status, "posted")
  );
}

export async function getDamContentItems(
  tab: ContentTab
): Promise<DamContentItem[]> {
  return db
    .select({
      id: contentQueue.id,
      title: contentQueue.caption,
      status: contentQueue.status,
      platform: contentQueue.platformId,
      created_at: contentQueue.createdAt,
      content_type: contentQueue.contentType,
    })
    .from(contentQueue)
    .where(contentWhereClause(tab))
    .orderBy(desc(contentQueue.createdAt))
    .limit(50);
}

export async function updateDamContentStatus(
  id: string,
  status: ContentStatus
): Promise<void> {
  await db
    .update(contentQueue)
    .set({ status })
    .where(eq(contentQueue.id, id));
}
