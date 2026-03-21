import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { pagePath, pageType, regionCode, complexId } = await request.json();

    if (!pagePath) {
      return NextResponse.json(
        { error: "pagePath는 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("increment_page_view", {
      p_page_path: pagePath,
      p_page_type: pageType || null,
      p_region_code: regionCode || null,
      p_complex_id: complexId || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "요청을 처리할 수 없습니다." },
      { status: 400 }
    );
  }
}
