import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const db = createServiceClient();
    const [txnCount, complexCount, pushCount, viewCount, nullHighest, recentTx] =
      await Promise.allSettled([
        db.from("apt_transactions").select("id", { count: "exact", head: true }),
        db.from("apt_complexes").select("id", { count: "exact", head: true }),
        db.from("push_subscriptions").select("id", { count: "exact", head: true }),
        db.from("page_views").select("id", { count: "exact", head: true }),
        db.from("apt_complexes").select("id", { count: "exact", head: true }).is("highest_price", null),
        db
          .from("apt_transactions")
          .select("id, apt_name, deal_amount, deal_date, area, sido_name")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    return NextResponse.json({
      transactions: txnCount.status === "fulfilled" ? txnCount.value.count : 0,
      complexes: complexCount.status === "fulfilled" ? complexCount.value.count : 0,
      pushSubscribers: pushCount.status === "fulfilled" ? pushCount.value.count : 0,
      pageViews: viewCount.status === "fulfilled" ? viewCount.value.count : 0,
      nullHighestCount: nullHighest.status === "fulfilled" ? nullHighest.value.count : 0,
      recentTransactions:
        recentTx.status === "fulfilled" ? (recentTx.value.data ?? []) : [],
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
