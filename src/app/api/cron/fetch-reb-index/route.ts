import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAllIndices, type RebIndexItem } from "@/lib/api/reb";

export const maxDuration = 120;

/**
 * 한국부동산원 아파트 매매/전세 가격지수 수집 크론
 * 주간 실행 (가격지수는 월별 업데이트)
 */
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
    // 최근 2개월 범위로 조회 (월별 데이터이므로)
    const now = new Date();
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startDate = `${twoMonthsAgo.getFullYear()}${String(twoMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
    const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const indices = await fetchAllIndices(startDate, endDate);

    for (const item of indices) {
      // 이전 값 조회 (변동률 보완)
      let prevValue = item.prevValue;
      let changeRate = item.changeRate;

      if (prevValue === null) {
        const { data: prevRow } = await supabase
          .from("reb_price_indices")
          .select("index_value")
          .eq("index_type", item.indexType)
          .eq("region_name", item.regionName)
          .lt("base_date", item.baseDate)
          .order("base_date", { ascending: false })
          .limit(1)
          .single();

        if (prevRow) {
          prevValue = prevRow.index_value;
          changeRate =
            prevValue !== null && prevValue !== 0
              ? Math.round(((item.indexValue - prevValue) / prevValue) * 10000) / 100
              : null;
        }
      }

      const { error } = await supabase
        .from("reb_price_indices")
        .upsert(
          {
            index_type: item.indexType,
            region_name: item.regionName,
            index_value: item.indexValue,
            base_date: item.baseDate,
            prev_value: prevValue,
            change_rate: changeRate,
          },
          { onConflict: "index_type,region_name,base_date" }
        );

      if (error) {
        errors.push(`${item.regionName}/${item.indexType}: ${error.message}`);
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
