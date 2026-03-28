/**
 * 군집 지수 계산 엔진
 *
 * 지역 코드 배열을 받아 월별 중위가 지수(기준시점=100)를 반환한다.
 */

import { getPool } from "@/lib/db/client";
import { computeMedianPrice, groupByMonth, isDirectDeal } from "@/lib/price-normalization";

export interface ClusterIndexPoint {
  month: string;
  index: number;
  medianPrice: number;
  count: number;
}

export async function computeClusterIndex(
  regionCodes: string[],
  minTransactions = 3
): Promise<ClusterIndexPoint[]> {
  if (regionCodes.length === 0) return [];

  const placeholders = regionCodes.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `
    SELECT trade_date, trade_price, floor, deal_type
    FROM apt_transactions
    WHERE region_code IN (${placeholders})
      AND property_type = 1
    ORDER BY trade_date ASC
  `;

  const pool = getPool();
  const result = await pool.query(sql, regionCodes);

  type Row = {
    trade_date: string;
    trade_price: number | string;
    floor: number | string;
    deal_type: string | null;
  };

  const rows = result.rows as Row[];

  // Filter out direct deals for cluster-level index computation
  const filtered = rows
    .filter((r) => !isDirectDeal(r.deal_type))
    .map((r) => ({
      trade_date: typeof r.trade_date === "string" ? r.trade_date.slice(0, 10) : String(r.trade_date),
      trade_price: Number(r.trade_price),
    }));

  const monthly = groupByMonth(filtered);

  // Find base month: first month with enough transactions
  const baseMonthEntry = monthly.find((m) => m.prices.length >= minTransactions);
  if (!baseMonthEntry) return [];

  const baseMedian = computeMedianPrice(baseMonthEntry.prices);
  if (baseMedian === 0) return [];

  const points: ClusterIndexPoint[] = [];

  for (const entry of monthly) {
    if (entry.prices.length < minTransactions) continue;
    const median = computeMedianPrice(entry.prices);
    const index = Math.round((median / baseMedian) * 1000) / 10;
    points.push({
      month: entry.month,
      index,
      medianPrice: median,
      count: entry.prices.length,
    });
  }

  return points;
}
