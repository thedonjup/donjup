import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptTransactions, aptComplexes, pushSubscriptions, pageViews } from "@/lib/db/schema";
import { isNull, sql, desc } from "drizzle-orm";

export async function GET(request: Request) {
  // 관리자 API 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [txnCount, complexCount, pushCount, viewCount, nullHighest, recentTx] =
      await Promise.allSettled([
        db.select({ count: sql<number>`count(*)` }).from(aptTransactions),
        db.select({ count: sql<number>`count(*)` }).from(aptComplexes),
        db.select({ count: sql<number>`count(*)` }).from(pushSubscriptions),
        db.select({ count: sql<number>`count(*)` }).from(pageViews),
        // apt_complexes doesn't have highest_price — count complexes missing latitude as proxy
        db
          .select({ count: sql<number>`count(*)` })
          .from(aptComplexes)
          .where(isNull(aptComplexes.latitude)),
        db
          .select({
            id: aptTransactions.id,
            apt_name: aptTransactions.aptName,
            trade_price: aptTransactions.tradePrice,
            trade_date: aptTransactions.tradeDate,
            region_name: aptTransactions.regionName,
          })
          .from(aptTransactions)
          .orderBy(desc(aptTransactions.createdAt))
          .limit(10),
      ]);

    return NextResponse.json({
      transactions: txnCount.status === "fulfilled" ? Number(txnCount.value[0]?.count ?? 0) : 0,
      complexes: complexCount.status === "fulfilled" ? Number(complexCount.value[0]?.count ?? 0) : 0,
      pushSubscribers: pushCount.status === "fulfilled" ? Number(pushCount.value[0]?.count ?? 0) : 0,
      pageViews: viewCount.status === "fulfilled" ? Number(viewCount.value[0]?.count ?? 0) : 0,
      nullHighestCount: nullHighest.status === "fulfilled" ? Number(nullHighest.value[0]?.count ?? 0) : 0,
      recentTransactions: recentTx.status === "fulfilled" ? recentTx.value : [],
    });
  } catch {
    return NextResponse.json({
      transactions: 0,
      complexes: 0,
      pushSubscribers: 0,
      pageViews: 0,
      nullHighestCount: 0,
      recentTransactions: [],
    });
  }
}
