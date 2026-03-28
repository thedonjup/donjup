import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region"); // region_code
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  try {
    const offset = (page - 1) * limit;

    const whereClause = region ? eq(aptComplexes.regionCode, region) : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(aptComplexes)
        .where(whereClause)
        .orderBy(desc(aptComplexes.updatedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(aptComplexes)
        .where(whereClause),
    ]);

    const count = Number(countResult[0]?.count ?? 0);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (e) {
    logger.error("Failed to fetch apt complexes", { error: e, route: "/api/apt" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
