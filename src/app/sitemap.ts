import type { MetadataRoute } from "next";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://donjup.com";
  const now = new Date();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/today`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${baseUrl}/new-highs`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${baseUrl}/market`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/trend`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/themes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/themes/reconstruction`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/themes/large-complex`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/themes/new-build`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/themes/crash-deals`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/daily/archive`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/rate`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/rate/calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/rent`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${baseUrl}/map`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // 전국 시/도별 마켓 페이지
  const sidoPages: MetadataRoute.Sitemap = Object.values(REGION_HIERARCHY).map((sido) => ({
    url: `${baseUrl}/market/${sido.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  // 전국 시/군/구별 마켓 페이지
  const sigunguPages: MetadataRoute.Sitemap = Object.values(REGION_HIERARCHY).flatMap((sido) =>
    Object.keys(sido.sigungu).map((code) => ({
      url: `${baseUrl}/market/${sido.slug}/${code}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  );

  return [...staticPages, ...sidoPages, ...sigunguPages];
}
