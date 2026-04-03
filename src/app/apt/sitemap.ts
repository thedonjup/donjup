import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { isNotNull, asc, sql } from "drizzle-orm";

const ITEMS_PER_SITEMAP = 5000;

export async function generateSitemaps() {
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(aptComplexes)
    .where(isNotNull(aptComplexes.govtComplexId));
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
    govtComplexId: aptComplexes.govtComplexId,
  }).from(aptComplexes)
    .where(isNotNull(aptComplexes.govtComplexId))
    .orderBy(asc(aptComplexes.id))
    .offset(offset)
    .limit(ITEMS_PER_SITEMAP);

  if (!complexes || complexes.length === 0) {
    return [];
  }

  return complexes.map((c) => ({
    url: `${baseUrl}/apt/${c.govtComplexId}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
}
