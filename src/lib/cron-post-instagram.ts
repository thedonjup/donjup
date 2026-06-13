import { and, desc, eq, like } from "drizzle-orm";
import { safeErrorMessage } from "@/lib/api/safe-error-response";
import { contentQueue, instagramPosts } from "@/lib/db/schema";
import { db } from "@/lib/db";
import {
  getRemainingQuota,
  publishCarousel,
  publishPhoto,
} from "@/lib/instagram/client";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

type ReadyCardnewsQueueItem = {
  id: string;
  storage_urls: string[];
  caption: string | null;
  hashtags: string[] | null;
  report_date: string;
  content_type: string;
};

type PostInstagramBody =
  | {
      success: true;
      skipped: true;
      reason: string;
    }
  | {
      success: true;
      mediaId: string;
      queueId: string;
      postType: "carousel" | "photo";
      imageCount: number;
    }
  | {
      success: false;
      error: string;
    };

export type PostInstagramResult = {
  status: number;
  body: PostInstagramBody;
};

function postTypeForImages(imageUrls: string[]): "carousel" | "photo" {
  return imageUrls.length >= 2 ? "carousel" : "photo";
}

function buildFullCaption(
  caption: string | null,
  hashtags: string[] | null
): string {
  const hashtagText = Array.isArray(hashtags)
    ? hashtags.map((tag) => `#${tag}`).join(" ")
    : "";
  const baseCaption = String(caption ?? "");

  return hashtagText ? `${baseCaption}\n\n${hashtagText}` : baseCaption;
}

async function getReadyCardnewsQueueItem(): Promise<ReadyCardnewsQueueItem | null> {
  const rows = await db
    .select({
      id: contentQueue.id,
      storage_urls: contentQueue.storageUrls,
      caption: contentQueue.caption,
      hashtags: contentQueue.hashtags,
      report_date: contentQueue.reportDate,
      content_type: contentQueue.contentType,
    })
    .from(contentQueue)
    .where(
      and(
        eq(contentQueue.status, "ready"),
        like(contentQueue.contentType, "cardnews_%")
      )
    )
    .orderBy(desc(contentQueue.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

async function publishInstagramMedia(
  imageUrls: string[],
  fullCaption: string
): Promise<{ mediaId: string; postType: "carousel" | "photo" }> {
  if (postTypeForImages(imageUrls) === "carousel") {
    const result = await publishCarousel(imageUrls, fullCaption);
    return { mediaId: result.mediaId, postType: "carousel" };
  }

  const imageUrl = imageUrls[0];
  if (!imageUrl) {
    throw new Error("No image URLs found in queue item");
  }

  const result = await publishPhoto(imageUrl, fullCaption);
  return { mediaId: result.mediaId, postType: "photo" };
}

async function recordInstagramHistory(params: {
  mediaId: string;
  queueItem: ReadyCardnewsQueueItem;
  fullCaption: string;
  imageUrls: string[];
  postType: "carousel" | "photo";
}): Promise<void> {
  try {
    await db.insert(instagramPosts).values({
      mediaId: params.mediaId,
      contentQueueId: params.queueItem.id,
      reportDate: params.queueItem.report_date,
      contentType: params.queueItem.content_type,
      caption: params.fullCaption,
      imageUrls: params.imageUrls,
      imageCount: params.imageUrls.length,
      postType: params.postType,
      postedAt: new Date(),
    });
  } catch (historyError) {
    logger.error("Post-instagram failed to record history", {
      error: historyError,
      cron: "post-instagram",
    });
  }
}

async function markQueuePosted(
  queueId: string,
  mediaId: string
): Promise<void> {
  await db
    .update(contentQueue)
    .set({
      status: "posted",
      postedAt: new Date(),
      platformId: mediaId,
    })
    .where(eq(contentQueue.id, queueId));
}

export async function postReadyCardnewsToInstagram(): Promise<PostInstagramResult> {
  const remaining = await getRemainingQuota();
  if (remaining <= 0) {
    return {
      status: 200,
      body: {
        success: true,
        skipped: true,
        reason: "Instagram daily posting limit reached",
      },
    };
  }

  const queueItem = await getReadyCardnewsQueueItem();
  if (!queueItem) {
    return {
      status: 200,
      body: {
        success: true,
        skipped: true,
        reason: "No ready cardnews in queue",
      },
    };
  }

  const imageUrls = Array.isArray(queueItem.storage_urls)
    ? queueItem.storage_urls
    : [];
  if (imageUrls.length === 0) {
    return {
      status: 400,
      body: { success: false, error: "No image URLs found in queue item" },
    };
  }

  const fullCaption = buildFullCaption(queueItem.caption, queueItem.hashtags);
  const { mediaId, postType } = await publishInstagramMedia(
    imageUrls,
    fullCaption
  );

  await recordInstagramHistory({
    mediaId,
    queueItem,
    fullCaption,
    imageUrls,
    postType,
  });

  try {
    await markQueuePosted(queueItem.id, mediaId);
  } catch (updateError) {
    logger.error("Post-instagram failed to update queue", {
      error: updateError,
      cron: "post-instagram",
    });
    await sendSlackAlert(
      `[post-instagram] Queue update failed after publishing: ${safeErrorMessage(updateError)}`
    );

    return {
      status: 500,
      body: {
        success: false,
        error: `Post published (${mediaId}) but queue update failed`,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      mediaId,
      queueId: queueItem.id,
      postType,
      imageCount: imageUrls.length,
    },
  };
}
