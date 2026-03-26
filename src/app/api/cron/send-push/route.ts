import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import webpush from "web-push";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(
    "mailto:admin@donjup.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. 오늘의 데일리 리포트 조회
    const { data: report } = await supabase
      .from("daily_reports")
      .select("title,summary,top_drops")
      .eq("report_date", today)
      .single();

    if (!report) {
      return NextResponse.json({
        success: true,
        message: "No report for today, skipping push",
        pushSent: 0,
      });
    }

    // 2. 폭락 1위 아파트 이름 추출
    const topDrop = Array.isArray(report.top_drops) && report.top_drops.length > 0
      ? (report.top_drops[0] as { apt_name?: string })
      : null;

    // 3. 푸시 구독 목록 조회
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth");

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribers",
        pushSent: 0,
      });
    }

    // 4. 알림 페이로드 생성
    const payload = JSON.stringify({
      title: "오늘의 부동산 리포트가 도착했습니다",
      body: topDrop?.apt_name
        ? `${topDrop.apt_name} 폭락 외 - ${report.summary || "오늘의 시장 분석을 확인하세요"}`
        : report.summary || "오늘의 부동산 시장 분석을 확인해보세요",
      url: "/daily/archive",
    });

    // 5. 모든 구독자에게 푸시 발송
    const results = await Promise.allSettled(
      subs.map((sub: any) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
          .catch(async (err) => {
            // 만료/해제된 구독 삭제
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", sub.endpoint);
            }
            throw err;
          })
      )
    );

    const pushSent = results.filter((r) => r.status === "fulfilled").length;
    const pushFailed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      reportDate: today,
      pushSent,
      pushFailed,
      totalSubscribers: subs.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
