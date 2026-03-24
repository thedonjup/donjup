import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dam/"],
      },
    ],
    sitemap: [
      "https://donjup.com/sitemap.xml",
      "https://donjup.com/apt/sitemap.xml",
    ],
  };
}
