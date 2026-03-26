import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region"); // region_code
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const supabase = createServiceClient();

  let query = supabase
    .from("apt_complexes")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (region) {
    query = query.eq("region_code", region);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}
