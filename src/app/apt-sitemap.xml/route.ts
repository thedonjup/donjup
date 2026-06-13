import { createAptSitemapUrls, parseSitemapCount } from "@/lib/sitemap-config";
import { createSitemapIndexXml, SITEMAP_XML_CONTENT_TYPE } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

const BASE_URL = "https://donjup.com";

export function GET(): Response {
  const sitemapUrls = createAptSitemapUrls(
    BASE_URL,
    parseSitemapCount(process.env.DONJUP_APT_SITEMAP_COUNT)
  );

  return new Response(createSitemapIndexXml(sitemapUrls), {
    headers: {
      "Content-Type": SITEMAP_XML_CONTENT_TYPE,
    },
  });
}
