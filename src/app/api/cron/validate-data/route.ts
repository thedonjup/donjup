import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import { sendSlackAlert } from "@/lib/alert";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5분

const MAX_NULL_RECORDS = 500;

type DropLevel = "normal" | "decline" | "crash" | "severe";

function calcDropLevel(changeRate: number | null): DropLevel {
  if (changeRate === null) return "normal";
  if (changeRate <= -25) return "severe";
  if (changeRate <= -15) return "crash";
  if (changeRate <= -10) return "decline";
  return "normal";
}

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const log: string[] = [];
  const results: Record<string, unknown> = {};

  // ─── 1. NULL highest_price 건수 확인 ───
  const { count: nullHighestCount } = await supabase
    .from("apt_transactions")
    .select("id", { count: "exact", head: true })
    .is("highest_price", null);

  results.nullHighestCount = nullHighestCount ?? 0;
  log.push(`NULL highest_price: ${nullHighestCount ?? 0}건`);

  // ─── 2. NULL highest_price 자동 재계산 (최대 500건의 그룹) ───
  let recalculated = 0;
  if ((nullHighestCount ?? 0) > 0) {
    // NULL이 있는 그룹 식별 (최대 500건 처리를 위해 그룹 단위로 조회)
    const { data: nullGroups } = await supabase
      .from("apt_transactions")
      .select("apt_name, size_sqm")
      .is("highest_price", null)
      .limit(MAX_NULL_RECORDS);

    // 유니크 그룹 추출
    const uniqueGroups = new Map<string, { aptName: string; sizeSqm: number }>();
    for (const row of nullGroups ?? []) {
      const key = `${row.apt_name}||${row.size_sqm}`;
      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, { aptName: row.apt_name, sizeSqm: row.size_sqm });
      }
    }

    log.push(`재계산 대상 그룹: ${uniqueGroups.size}개`);

    // 각 그룹별로 전체 거래를 시간순으로 조회 후 재계산
    for (const [, group] of uniqueGroups) {
      const { data: transactions } = await supabase
        .from("apt_transactions")
        .select("id, trade_price, trade_date")
        .eq("apt_name", group.aptName)
        .eq("size_sqm", group.sizeSqm)
        .order("trade_date", { ascending: true })
        .order("id", { ascending: true });

      if (!transactions || transactions.length === 0) continue;

      let runningMax = 0;

      for (const t of transactions) {
        let highestPrice: number;
        let changeRate: number | null = null;
        let isNewHigh = false;
        let isSignificantDrop = false;

        if (runningMax === 0) {
          // 첫 거래
          highestPrice = t.trade_price;
        } else if (t.trade_price > runningMax) {
          // 신고가 갱신
          highestPrice = t.trade_price;
          isNewHigh = true;
        } else {
          // 최고가 이하 거래
          highestPrice = runningMax;
          changeRate = parseFloat(
            (((t.trade_price - runningMax) / runningMax) * 100).toFixed(2)
          );
          isSignificantDrop = changeRate <= -15;
        }

        runningMax = Math.max(runningMax, t.trade_price);
        const dropLevel = calcDropLevel(changeRate);

        await supabase
          .from("apt_transactions")
          .update({
            highest_price: highestPrice,
            change_rate: changeRate,
            is_new_high: isNewHigh,
            is_significant_drop: isSignificantDrop,
            drop_level: dropLevel,
          })
          .eq("id", t.id);

        recalculated++;
      }
    }

    log.push(`재계산 완료: ${recalculated}건`);
  }
  results.recalculated = recalculated;

  // ─── 3. 이상치 탐지 (같은 단지+면적에서 직전 거래 대비 10배 이상) ───
  // 변동률이 극단적인 거래를 이상치로 간주
  const { count: anomalyCount } = await supabase
    .from("apt_transactions")
    .select("id", { count: "exact", head: true })
    .not("change_rate", "is", null)
    .or("change_rate.gt.900,change_rate.lt.-95");

  results.anomalyCount = anomalyCount ?? 0;
  log.push(`이상치 의심 건수: ${anomalyCount ?? 0}건`);

  // ─── 4. 유효하지 않은 가격 확인 ───
  const { count: invalidPriceCount } = await supabase
    .from("apt_transactions")
    .select("id", { count: "exact", head: true })
    .lte("trade_price", 0);

  results.invalidPriceCount = invalidPriceCount ?? 0;
  log.push(`유효하지 않은 가격: ${invalidPriceCount ?? 0}건`);

  // ─── 5. 폭락 플래그 불일치 확인 ───
  const { count: flagMismatchCount } = await supabase
    .from("apt_transactions")
    .select("id", { count: "exact", head: true })
    .eq("is_significant_drop", true)
    .or("change_rate.is.null,change_rate.gt.-15");

  results.flagMismatchCount = flagMismatchCount ?? 0;
  log.push(`폭락 플래그 불일치: ${flagMismatchCount ?? 0}건`);

  // ─── 6. 변동률 범위 초과 확인 ───
  const { count: outOfRangeCount } = await supabase
    .from("apt_transactions")
    .select("id", { count: "exact", head: true })
    .not("change_rate", "is", null)
    .or("change_rate.lt.-100,change_rate.gt.1000");

  results.outOfRangeCount = outOfRangeCount ?? 0;
  log.push(`변동률 범위 초과: ${outOfRangeCount ?? 0}건`);

  // Slack alert on anomalies
  const totalAnomalies =
    (anomalyCount ?? 0) + (invalidPriceCount ?? 0) + (flagMismatchCount ?? 0) + (outOfRangeCount ?? 0);
  if (totalAnomalies > 0) {
    await sendSlackAlert(
      `데이터 검증 이상 발견: 이상치 ${anomalyCount ?? 0}건, 유효하지 않은 가격 ${invalidPriceCount ?? 0}건, 플래그 불일치 ${flagMismatchCount ?? 0}건, 범위 초과 ${outOfRangeCount ?? 0}건`
    );
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    log,
    ...results,
  });
}
