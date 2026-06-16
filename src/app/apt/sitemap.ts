import { getCachedAptSitemapItems } from "@/lib/apt-sitemap-query";
import { aptUrl } from "@/lib/apt-url";
import { logDatabaseFailure } from "@/lib/db/logging";
import { createSitemapIds, parseSitemapCount } from "@/lib/sitemap-config";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 86400; // 24시간마다 갱신

const ITEMS_PER_SITEMAP = 10000;

export async function generateSitemaps() {
  return createSitemapIds(parseSitemapCount(process.env.DONJUP_APT_SITEMAP_COUNT));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const sitemapId = Number(await id);
  if (!Number.isInteger(sitemapId) || sitemapId < 0) {
    return [];
  }

  const baseUrl = "https://donjup.com";

  try {
    const complexes = await getCachedAptSitemapItems(sitemapId, ITEMS_PER_SITEMAP);

    return complexes.map((c) => ({
      url: `${baseUrl}${aptUrl({
        govtComplexId: c.govtComplexId,
        identityId: c.identityId,
        regionCode: c.regionCode,
        slug: c.slug,
      })}`,
      lastModified: c.updatedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (e) {
    logDatabaseFailure("Apt sitemap query failed", e, {
      route: "/apt/sitemap",
      sitemapId,
    });
    return [];
  }
}
