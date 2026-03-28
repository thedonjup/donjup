import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { asc, sql } from "drizzle-orm";

const ITEMS_PER_SITEMAP = 5000;

export async function generateSitemaps() {
  const result = await db.select({ count: sql<number>`count(*)` }).from(aptComplexes);
  const total = Number(result[0]?.count ?? 0);
  const numSitemaps = Math.max(1, Math.ceil(total / ITEMS_PER_SITEMAP));

  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const baseUrl = "https://donjup.com";

  const offset = id * ITEMS_PER_SITEMAP;

  const complexes = await db.select({
    region_code: aptComplexes.regionCode,
    slug: aptComplexes.slug,
  }).from(aptComplexes)
    .orderBy(asc(aptComplexes.id))
    .offset(offset)
    .limit(ITEMS_PER_SITEMAP);

  if (!complexes || complexes.length === 0) {
    return [];
  }

  return complexes.map(
    (c) => ({
      url: `${baseUrl}/apt/${c.region_code}/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );
}
