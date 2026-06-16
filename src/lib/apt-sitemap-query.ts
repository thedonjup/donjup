import { unstable_cache } from "next/cache";
import { asc } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";

export type AptSitemapItem = {
  govtComplexId: string | null;
  identityId: string | null;
  regionCode: string;
  slug: string;
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
      identityId: aptComplexes.identityId,
      regionCode: aptComplexes.regionCode,
      slug: aptComplexes.slug,
      updatedAt: aptComplexes.updatedAt,
    })
    .from(aptComplexes)
    .orderBy(asc(aptComplexes.id))
    .offset(offset)
    .limit(itemsPerSitemap);

  return complexes.map((complex) => ({
    govtComplexId: complex.govtComplexId,
    identityId: complex.identityId,
    regionCode: complex.regionCode,
    slug: complex.slug,
    updatedAt: toIsoDateTime(complex.updatedAt),
  }));
}

export const getCachedAptSitemapItems = unstable_cache(
  fetchAptSitemapItems,
  ["apt-sitemap-items-v2"],
  {
    revalidate: 86400,
    tags: [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES],
  },
);
