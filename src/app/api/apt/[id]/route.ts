import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // slug 또는 UUID로 조회
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const complexRows = await db
    .select()
    .from(aptComplexes)
    .where(isUuid ? eq(aptComplexes.id, id) : eq(aptComplexes.slug, id))
    .limit(1);

  const complex = complexRows[0];

  if (!complex) {
    return NextResponse.json({ error: "단지를 찾을 수 없습니다." }, { status: 404 });
  }

  // 최근 거래 내역
  const transactions = await db
    .select()
    .from(aptTransactions)
    .where(eq(aptTransactions.aptName, complex.aptName))
    .orderBy(desc(aptTransactions.tradeDate))
    .limit(50);

  return NextResponse.json({
    complex,
    transactions,
  });
}
