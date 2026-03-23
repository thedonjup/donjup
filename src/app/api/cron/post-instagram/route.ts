import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { postToInstagram } from "@/lib/api/instagram";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    // content_queue에서 ready 상태의 카드뉴스 조회 (최신 1건)
    const { data: queueItem, error: fetchError } = await supabase
      .from("content_queue")
      .select("id,storage_urls,caption,hashtags,report_date")
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

    const { id, storage_urls, caption, hashtags } = queueItem;

    // 첫 번째 이미지(표지)를 인스타그램에 포스팅
    const imageUrl = storage_urls?.[0];
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "No image URL found" },
        { status: 400 }
      );
    }

    // 캡션 + 해시태그 조합
    const hashtagStr = (hashtags as string[])
      .map((tag: string) => `#${tag}`)
      .join(" ");
    const fullCaption = `${caption}\n\n${hashtagStr}`;

    // 인스타그램 포스팅
    const mediaId = await postToInstagram(imageUrl, fullCaption);

    // content_queue 상태 업데이트
    const { error: updateError } = await supabase
      .from("content_queue")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        platform_id: mediaId,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Queue update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mediaId,
      queueId: id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
