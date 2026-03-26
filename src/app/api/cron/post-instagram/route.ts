import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import {
  publishPhoto,
  publishCarousel,
  getRemainingQuota,
} from "@/lib/instagram/client";

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

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
    const { data: queueItem, error: fetchError } = await supabase
      .from("content_queue")
      .select("id,storage_urls,caption,hashtags,report_date,content_type")
      .eq("status", "ready")
      .like("content_type", "cardnews_%")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !queueItem) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "No ready cardnews in queue",
      });
    }

    const { id, storage_urls, caption, hashtags, report_date, content_type } =
      queueItem;

    const imageUrls: string[] = Array.isArray(storage_urls)
      ? storage_urls
      : [];

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
    const { error: historyError } = await supabase
      .from("instagram_posts")
      .insert({
        media_id: mediaId,
        content_queue_id: id,
        report_date,
        content_type,
        caption: fullCaption,
        image_urls: imageUrls,
        image_count: imageUrls.length,
        post_type: imageUrls.length >= 2 ? "carousel" : "photo",
        posted_at: new Date().toISOString(),
      });

    if (historyError) {
      // Log but don't fail — the post was already published
      console.error(
        "[post-instagram] Failed to record history:",
        historyError.message
      );
    }

    // ---------------------------------------------------------------
    // 6. content_queue 상태 업데이트
    // ---------------------------------------------------------------
    const { error: updateError } = await supabase
      .from("content_queue")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        platform_id: mediaId,
      })
      .eq("id", id);

    if (updateError) {
      console.error(
        "[post-instagram] Failed to update queue:",
        updateError.message
      );
      return NextResponse.json(
        {
          success: false,
          error: `Post published (${mediaId}) but queue update failed: ${updateError.message}`,
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
    console.error("[post-instagram] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
