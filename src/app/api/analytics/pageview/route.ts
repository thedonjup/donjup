import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { pagePath, pageType, regionCode, complexId, utmSource, utmMedium, utmCampaign } = await request.json();

    if (!pagePath) {
      return NextResponse.json(
        { error: "pagePath는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("page_views")
      .upsert(
        {
          page_path: pagePath,
          page_type: pageType || null,
          view_date: today,
          view_count: 1,
        },
        { onConflict: "page_path,view_date" }
      );

    if (error) {
      // page_views upsert 실패 시에도 200 반환 (분석은 best-effort)
      logger.warn("Failed to track page view", { error: error.message, route: "/api/analytics/pageview" });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "요청을 처리할 수 없습니다." },
      { status: 400 }
    );
  }
}
