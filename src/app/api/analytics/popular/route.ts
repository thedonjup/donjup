import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);

  const supabase = createServiceClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("page_views")
    .select("page_path,page_type,view_count")
    .gte("view_date", startDate.toISOString().split("T")[0])
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
