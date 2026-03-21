import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rateType = searchParams.get("type"); // BASE_RATE, CD_91 등
  const months = parseInt(searchParams.get("months") ?? "12", 10);

  const supabase = createServiceClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  let query = supabase
    .from("finance_rates")
    .select("rate_type,rate_value,change_bp,base_date")
    .gte("base_date", startDate.toISOString().split("T")[0])
    .order("base_date", { ascending: true });

  if (rateType) {
    query = query.eq("rate_type", rateType);
  }

  const { data, error } = await query.limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
