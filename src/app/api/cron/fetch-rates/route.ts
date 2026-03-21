import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAllRates, type EcosRateItem } from "@/lib/api/ecos";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const errors: string[] = [];
  let inserted = 0;

  try {
    const rates = await fetchAllRates();

    for (const rate of rates) {
      // 이전 값 조회 (변동폭 계산)
      const { data: prevRow } = await supabase
        .from("finance_rates")
        .select("rate_value")
        .eq("rate_type", rate.rateType)
        .lt("base_date", rate.baseDate)
        .order("base_date", { ascending: false })
        .limit(1)
        .single();

      const prevValue = prevRow?.rate_value ?? null;
      const changeBp = prevValue !== null
        ? Math.round((rate.rateValue - prevValue) * 100)
        : null;

      const { error } = await supabase
        .from("finance_rates")
        .upsert(
          {
            rate_type: rate.rateType,
            rate_value: rate.rateValue,
            prev_value: prevValue,
            change_bp: changeBp,
            base_date: rate.baseDate,
            source: rate.source,
          },
          { onConflict: "rate_type,base_date" }
        );

      if (error) {
        errors.push(`${rate.rateType}: ${error.message}`);
      } else {
        inserted++;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
  }

  return NextResponse.json({
    success: errors.length === 0,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
