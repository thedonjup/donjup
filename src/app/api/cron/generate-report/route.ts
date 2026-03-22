import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import webpush from "web-push";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // 1. 폭락 TOP 10
    const { data: topDrops } = await supabase
      .from("apt_transactions")
      .select("id,region_name,apt_name,size_sqm,trade_price,highest_price,change_rate,trade_date")
      .eq("is_significant_drop", true)
      .order("change_rate", { ascending: true })
      .limit(10);

    // 2. 신고가 TOP 10
    const { data: topHighs } = await supabase
      .from("apt_transactions")
      .select("id,region_name,apt_name,size_sqm,trade_price,highest_price,change_rate,trade_date")
      .eq("is_new_high", true)
      .order("trade_date", { ascending: false })
      .limit(10);

    // 3. 최신 금리 요약
    const { data: latestRates } = await supabase
      .from("finance_rates")
      .select("rate_type,rate_value,prev_value,change_bp,base_date")
      .order("base_date", { ascending: false })
      .limit(10);

    // 금리 타입별 최신 1건만
    const rateMap = new Map<string, typeof latestRates extends (infer T)[] | null ? T : never>();
    for (const r of latestRates ?? []) {
      if (!rateMap.has(r.rate_type)) {
        rateMap.set(r.rate_type, r);
      }
    }
    const rateSummary = Array.from(rateMap.values());

    // 4. 거래량 요약 (최근 30일)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: volumeData } = await supabase
      .from("apt_transactions")
      .select("region_name")
      .gte("trade_date", thirtyDaysAgo);

    // 지역별 거래 건수 집계
    const volumeMap = new Map<string, number>();
    for (const row of volumeData ?? []) {
      // region_name에서 구 이름만 추출 (예: "강남구 역삼동" → "강남구")
      const gu = row.region_name?.split(" ")[0] ?? "기타";
      volumeMap.set(gu, (volumeMap.get(gu) ?? 0) + 1);
    }

    const volumeSummary = Array.from(volumeMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. 리포트 제목 생성
    const topDrop = topDrops?.[0];
    const title = topDrop
      ? `${topDrop.apt_name} ${Math.abs(topDrop.change_rate)}% 하락 외 | ${today} 돈줍 리포트`
      : `${today} 돈줍 데일리 리포트`;

    const summary = generateSummary(topDrops, topHighs, rateSummary, volumeSummary);

    // 6. daily_reports에 UPSERT
    const { error } = await supabase
      .from("daily_reports")
      .upsert(
        {
          report_date: today,
          title,
          summary,
          top_drops: topDrops ?? [],
          top_highs: topHighs ?? [],
          rate_summary: rateSummary,
          volume_summary: volumeSummary,
        },
        { onConflict: "report_date" }
      );

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 웹 푸시 알림 발송
    let pushSent = 0;
    if (
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ) {
      webpush.setVapidDetails(
        "mailto:admin@donjup.com",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth");

      if (subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: `오늘의 폭락 아파트: ${topDrop?.apt_name ?? "확인하기"}`,
          body: summary,
          url: `/daily/${today}`,
        });

        const results = await Promise.allSettled(
          subs.map((sub) =>
            webpush
              .sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload
              )
              .catch(async (err) => {
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

        pushSent = results.filter((r) => r.status === "fulfilled").length;
      }
    }

    return NextResponse.json({
      success: true,
      reportDate: today,
      title,
      stats: {
        drops: topDrops?.length ?? 0,
        highs: topHighs?.length ?? 0,
        rates: rateSummary.length,
        volumeRegions: volumeSummary.length,
        pushSent,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function generateSummary(
  drops: unknown[] | null,
  highs: unknown[] | null,
  rates: unknown[],
  volume: { region: string; count: number }[]
): string {
  const parts: string[] = [];

  if (drops && drops.length > 0) {
    parts.push(`최고가 대비 폭락 거래 ${drops.length}건 포착`);
  }
  if (highs && highs.length > 0) {
    parts.push(`신고가 갱신 ${highs.length}건`);
  }
  if (rates.length > 0) {
    parts.push(`금리 지표 ${rates.length}종 업데이트`);
  }
  if (volume.length > 0) {
    parts.push(`거래량 Top: ${volume.slice(0, 3).map((v) => v.region).join(", ")}`);
  }

  return parts.join(" | ");
}
