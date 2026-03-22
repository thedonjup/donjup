import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateCardNews } from "@/lib/cardnews/render";
import type { CardType, RankItem } from "@/lib/cardnews/types";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...

  // 월(1) 수(3) 금(5) → 폭락, 화(2) 목(4) → 신고가, 주말 → 스킵
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ success: true, skipped: true, reason: "weekend" });
  }

  const cardType: CardType = [1, 3, 5].includes(dayOfWeek) ? "drop" : "high";

  try {
    // daily_reports에서 오늘 데이터 조회
    const { data: report, error: reportError } = await supabase
      .from("daily_reports")
      .select("top_drops,top_highs")
      .eq("report_date", today)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { success: false, error: "No report found for today" },
        { status: 404 }
      );
    }

    const rawItems = cardType === "drop" ? report.top_drops : report.top_highs;

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json(
        { success: true, skipped: true, reason: "no data" }
      );
    }

    const items: RankItem[] = rawItems.slice(0, 3).map(
      (item: Record<string, unknown>, i: number) => ({
        rank: i + 1,
        apt_name: item.apt_name as string,
        region_name: item.region_name as string,
        highest_price: item.highest_price as number,
        trade_price: item.trade_price as number,
        change_rate: item.change_rate as number,
        size_sqm: item.size_sqm as number | undefined,
      })
    );

    // 카드뉴스 생성 (표지 + 3장 + CTA = 5장)
    const dateStr = today.replace(/-/g, ".");
    const buffers = await generateCardNews(dateStr, cardType, items);

    // Supabase Storage 업로드
    const storageUrls: string[] = [];
    const folder = `cardnews/${today}/${cardType}`;

    for (let i = 0; i < buffers.length; i++) {
      const fileName = `${folder}/${String(i + 1).padStart(2, "0")}.png`;
      const { error: uploadError } = await supabase.storage
        .from("content")
        .upload(fileName, buffers[i], {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json(
          { success: false, error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from("content")
        .getPublicUrl(fileName);

      storageUrls.push(urlData.publicUrl);
    }

    // caption & hashtags 생성
    const typeLabel = cardType === "drop" ? "폭락" : "신고가";
    const caption = [
      `📉 ${today} ${typeLabel} 아파트 TOP 3`,
      "",
      ...items.map(
        (item, i) =>
          `${i + 1}위 ${item.apt_name} (${item.region_name}) ${item.change_rate.toFixed(1)}%`
      ),
      "",
      "👉 더 많은 데이터: donjup.com",
    ].join("\n");

    const hashtags = [
      "돈줍",
      "부동산",
      "아파트",
      typeLabel,
      "부동산투자",
      "실거래가",
      ...items.map((item) => item.apt_name.replace(/\s/g, "")),
    ];

    // content_queue에 기록
    const { error: queueError } = await supabase.from("content_queue").insert({
      report_date: today,
      content_type: `cardnews_${cardType}`,
      storage_urls: storageUrls,
      caption,
      hashtags,
      status: "ready",
    });

    if (queueError) {
      return NextResponse.json(
        { success: false, error: `Queue insert failed: ${queueError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reportDate: today,
      cardType,
      images: storageUrls.length,
      storageUrls,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
