import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "drop"; // drop | high
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  const supabase = await createClient();

  if (type === "high") {
    // 신고가 갱신 거래
    const { data, error } = await supabase
      .from("apt_transactions")
      .select("*")
      .eq("is_new_high", true)
      .order("trade_date", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ type: "high", data });
  }

  // 폭락 거래 (하락률 순)
  const { data, error } = await supabase
    .from("apt_transactions")
    .select("*")
    .eq("is_significant_drop", true)
    .order("change_rate", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ type: "drop", data });
}
