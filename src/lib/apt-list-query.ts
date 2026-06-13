import { unstable_cache } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { aptComplexes, type AptComplex } from "@/lib/db/schema";
import { pageOffset } from "@/lib/pagination";

export type AptListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AptListResult = {
  data: AptComplex[];
  pagination: AptListPagination;
};

export async function getAptComplexList(
  region: string | null,
  page: number,
  limit: number
): Promise<AptListResult> {
  const offset = pageOffset(page, limit);
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

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export const getCachedAptComplexList = unstable_cache(
  getAptComplexList,
  ["apt-complex-list-v1"],
  {
    revalidate: 300,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  }
);
