import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const supabase = createServiceClient();

  // "latest"이면 가장 최근 리포트
  if (date === "latest") {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "리포트가 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ data });
  }

  // 날짜로 조회
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("report_date", date)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "해당 날짜 리포트가 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
