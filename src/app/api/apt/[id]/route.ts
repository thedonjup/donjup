import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // slug 또는 UUID로 조회
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data: complex, error } = await supabase
    .from("apt_complexes")
    .select("*")
    .eq(isUuid ? "id" : "slug", id)
    .single();

  if (error || !complex) {
    return NextResponse.json({ error: "단지를 찾을 수 없습니다." }, { status: 404 });
  }

  // 최근 거래 내역
  const { data: transactions } = await supabase
    .from("apt_transactions")
    .select("*")
    .eq("apt_name", complex.apt_name)
    .eq("region_code", complex.region_code)
    .order("trade_date", { ascending: false })
    .limit(50);

  return NextResponse.json({
    complex,
    transactions: transactions ?? [],
  });
}
