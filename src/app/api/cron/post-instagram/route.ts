import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentQueue, instagramPosts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  publishPhoto,
  publishCarousel,
  getRemainingQuota,
} from "@/lib/instagram/client";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ---------------------------------------------------------------
    // 1. Rate-limit pre-check
    // ---------------------------------------------------------------
    const remaining = await getRemainingQuota();
    if (remaining <= 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Instagram daily posting limit reached",
      });
    }

    // ---------------------------------------------------------------
    // 2. content_queue에서 ready 상태의 카드뉴스 조회 (최신 1건)
    // ---------------------------------------------------------------
    const queueRows = await db
      .select({
        id: contentQueue.id,
        storage_urls: contentQueue.storageUrls,
        caption: contentQueue.caption,
        hashtags: contentQueue.hashtags,
        report_date: contentQueue.reportDate,
        content_type: contentQueue.contentType,
      })
      .from(contentQueue)
      .where(eq(contentQueue.status, "ready"))
      .orderBy(desc(contentQueue.createdAt))
      .limit(1);

    const queueItem = queueRows[0];

    if (!queueItem) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "No ready cardnews in queue",
      });
    }

    // Filter to only cardnews_ content types
    if (!queueItem.content_type.startsWith("cardnews_")) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "No ready cardnews in queue",
      });
    }

    const { id, storage_urls, caption, hashtags, report_date, content_type } = queueItem;

    const imageUrls: string[] = Array.isArray(storage_urls) ? storage_urls : [];

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "No image URLs found in queue item" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------------
    // 3. 캡션 + 해시태그 조합
    // ---------------------------------------------------------------
    const hashtagStr = Array.isArray(hashtags)
      ? (hashtags as string[]).map((tag: string) => `#${tag}`).join(" ")
      : "";
    const fullCaption = hashtagStr
      ? `${caption}\n\n${hashtagStr}`
      : String(caption);

    // ---------------------------------------------------------------
    // 4. 인스타그램 포스팅 (캐러셀 또는 단일 이미지)
    // ---------------------------------------------------------------
    let mediaId: string;

    if (imageUrls.length >= 2) {
      // 카드뉴스는 보통 5장(표지 + 3 랭크 + CTA) → 캐러셀
      const result = await publishCarousel(imageUrls, fullCaption);
      mediaId = result.mediaId;
    } else {
      const result = await publishPhoto(imageUrls[0], fullCaption);
      mediaId = result.mediaId;
    }

    // ---------------------------------------------------------------
    // 5. instagram_posts 테이블에 포스팅 이력 기록
    // ---------------------------------------------------------------
    try {
      await db.insert(instagramPosts).values({
        mediaId,
        contentQueueId: id,
        reportDate: report_date,
        contentType: content_type,
        caption: fullCaption,
        imageUrls,
        imageCount: imageUrls.length,
        postType: imageUrls.length >= 2 ? "carousel" : "photo",
        postedAt: new Date(),
      });
    } catch (historyError) {
      // Log but don't fail — the post was already published
      logger.error("Post-instagram failed to record history", { error: historyError, cron: "post-instagram" });
    }

    // ---------------------------------------------------------------
    // 6. content_queue 상태 업데이트
    // ---------------------------------------------------------------
    try {
      await db
        .update(contentQueue)
        .set({
          status: "posted",
          postedAt: new Date(),
          platformId: mediaId,
        })
        .where(eq(contentQueue.id, id));
    } catch (updateError) {
      logger.error("Post-instagram failed to update queue", { error: updateError, cron: "post-instagram" });
      await sendSlackAlert(`[post-instagram] Queue 업데이트 실패 (포스팅은 완료): ${updateError instanceof Error ? updateError.message : String(updateError)}`);
      return NextResponse.json(
        {
          success: false,
          error: `Post published (${mediaId}) but queue update failed`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mediaId,
      queueId: id,
      postType: imageUrls.length >= 2 ? "carousel" : "photo",
      imageCount: imageUrls.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("Post-instagram failed", { error: e, cron: "post-instagram" });
    await sendSlackAlert(`[post-instagram] 실패: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
