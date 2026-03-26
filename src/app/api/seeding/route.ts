import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const platform = searchParams.get("platform");

  const supabase = createServiceClient();

  let query = supabase
    .from("seeding_queue")
    .select("id,platform,title,status,report_date")
    .eq("report_date", date)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count: data?.length ?? 0 });
}
