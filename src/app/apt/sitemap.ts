import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";

const ITEMS_PER_SITEMAP = 5000;

export async function generateSitemaps() {
  const db = createServiceClient();

  const { count } = await db
    .from("apt_complexes")
    .select("id", { count: "exact", head: true });

  const total = count ?? 0;
  const numSitemaps = Math.max(1, Math.ceil(total / ITEMS_PER_SITEMAP));

  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const baseUrl = "https://donjup.com";
  const db = createServiceClient();

  const offset = id * ITEMS_PER_SITEMAP;

  const { data: complexes } = await db
    .from("apt_complexes")
    .select("region_code,slug")
    .order("id", { ascending: true })
    .range(offset, offset + ITEMS_PER_SITEMAP - 1);

  if (!complexes || complexes.length === 0) {
    return [];
  }

  return complexes.map(
    (c: { region_code: string; slug: string }) => ({
      url: `${baseUrl}/apt/${c.region_code}/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );
}
