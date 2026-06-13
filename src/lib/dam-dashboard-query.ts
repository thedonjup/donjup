import { desc, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aptComplexes,
  aptTransactions,
  pageViews,
  pushSubscriptions,
} from "@/lib/db/schema";

export type DamDataCheck = {
  label: string;
  description: string;
  count: number;
  severity: "error" | "warn" | "ok";
};

export type DamDataResponse = {
  checks: DamDataCheck[];
};

export type DamStatsResponse = {
  transactions: number;
  complexes: number;
  pushSubscribers: number;
  pageViews: number;
  nullHighestCount: number;
  recentTransactions: Array<{
    id: string;
    apt_name: string;
    area: string;
    trade_price: number;
    trade_date: string;
    region_name: string;
  }>;
};

function firstCount(rows: Array<{ count: unknown }>): number {
  return Number(rows[0]?.count ?? 0);
}

export async function getDamDataChecks(): Promise<DamDataResponse> {
  const [nullGeo, totalComplexes, totalTx] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(aptComplexes)
      .where(isNull(aptComplexes.latitude)),
    db.select({ count: sql<number>`count(*)` }).from(aptComplexes),
    db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
  ]);

  const nullGeoCount = firstCount(nullGeo);
  const totalCx = firstCount(totalComplexes);
  const totalTxCount = firstCount(totalTx);

  return {
    checks: [
      {
        label: "좌표 정보 누락",
        description: "위도/경도가 없는 단지 수",
        count: nullGeoCount,
        severity: nullGeoCount > 100 ? "error" : nullGeoCount > 0 ? "warn" : "ok",
      },
      {
        label: "총 등록 단지",
        description: "complexes 테이블 전체 수",
        count: totalCx,
        severity: "ok",
      },
      {
        label: "총 거래 건수",
        description: "transactions 테이블 전체 수",
        count: totalTxCount,
        severity: "ok",
      },
    ],
  };
}

export async function getDamStats(): Promise<DamStatsResponse> {
  const [txnCount, complexCount, pushCount, viewCount, nullHighest, recentTx] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
      db.select({ count: sql<number>`count(*)` }).from(aptComplexes),
      db.select({ count: sql<number>`count(*)` }).from(pushSubscriptions),
      db.select({ count: sql<number>`count(*)` }).from(pageViews),
      db
        .select({ count: sql<number>`count(*)` })
        .from(aptTransactions)
        .where(isNull(aptTransactions.highestPrice)),
      db
        .select({
          id: aptTransactions.id,
          apt_name: aptTransactions.aptName,
          area: aptTransactions.sizeSqm,
          trade_price: aptTransactions.tradePrice,
          trade_date: aptTransactions.tradeDate,
          region_name: aptTransactions.regionName,
        })
        .from(aptTransactions)
        .orderBy(desc(aptTransactions.createdAt))
        .limit(10),
    ]);

  return {
    transactions: firstCount(txnCount),
    complexes: firstCount(complexCount),
    pushSubscribers: firstCount(pushCount),
    pageViews: firstCount(viewCount),
    nullHighestCount: firstCount(nullHighest),
    recentTransactions: recentTx,
  };
}
