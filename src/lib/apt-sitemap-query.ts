import { unstable_cache } from "next/cache";
import { asc, isNotNull } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";

export type AptSitemapItem = {
  govtComplexId: string;
  updatedAt: string | null;
};

function toIsoDateTime(value: Date | string | null): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

async function fetchAptSitemapItems(
  sitemapId: number,
  itemsPerSitemap: number
): Promise<AptSitemapItem[]> {
  const offset = sitemapId * itemsPerSitemap;
  const complexes = await db
    .select({
      govtComplexId: aptComplexes.govtComplexId,
      updatedAt: aptComplexes.updatedAt,
    })
    .from(aptComplexes)
    .where(isNotNull(aptComplexes.govtComplexId))
    .orderBy(asc(aptComplexes.id))
    .offset(offset)
    .limit(itemsPerSitemap);

  const items: AptSitemapItem[] = [];
  for (const complex of complexes) {
    if (complex.govtComplexId === null) continue;
    items.push({
      govtComplexId: complex.govtComplexId,
      updatedAt: toIsoDateTime(complex.updatedAt),
    });
  }

  return items;
}

export const getCachedAptSitemapItems = unstable_cache(
  fetchAptSitemapItems,
  ["apt-sitemap-items-v1"],
  {
    revalidate: 86400,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);
