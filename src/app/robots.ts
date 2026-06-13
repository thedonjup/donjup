import type { MetadataRoute } from "next";
import {
  createAptSitemapIndexUrl,
  createDailySitemapUrl,
} from "@/lib/sitemap-config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://donjup.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dam/"],
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      createDailySitemapUrl(baseUrl),
      createAptSitemapIndexUrl(baseUrl),
    ],
  };
}
