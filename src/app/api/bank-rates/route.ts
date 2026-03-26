import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import { logger } from "@/lib/logger";

/**
 * 은행별 주담대 최저금리 조회 API
 * GET /api/bank-rates
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("finance_rates")
    .select("rate_type, rate_value, base_date")
    .like("rate_type", "BANK_%")
    .neq("rate_type", "BANK_PRODUCTS_ALL")
    .order("base_date", { ascending: false })
    .limit(50);

  if (error) {
    logger.error("Failed to fetch bank rates", { error, route: "/api/bank-rates" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }

  // 은행별 최신 값만 추출
  const latestByBank = new Map<string, { rate_type: string; rate_value: number; base_date: string }>();
  for (const row of data ?? []) {
    if (!latestByBank.has(row.rate_type)) {
      latestByBank.set(row.rate_type, row);
    }
  }

  const rates = Array.from(latestByBank.values());
  const minRate = rates.length > 0
    ? Math.min(...rates.map((r) => r.rate_value))
    : null;

  return NextResponse.json({ rates, minRate });
}
