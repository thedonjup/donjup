import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://donjup.com";

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/rate`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/rate/calculator`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/daily/archive`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/market`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/rent`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${baseUrl}/trend`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  // 전국 시/도별 마켓 페이지
  const sidoPages: MetadataRoute.Sitemap = Object.values(REGION_HIERARCHY).map((sido) => ({
    url: `${baseUrl}/market/${sido.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  // 전국 시/군/구별 마켓 페이지
  const sigunguPages: MetadataRoute.Sitemap = Object.values(REGION_HIERARCHY).flatMap((sido) =>
    Object.keys(sido.sigungu).map((code) => ({
      url: `${baseUrl}/market/${sido.slug}/${code}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  );

  return [...staticPages, ...sidoPages, ...sigunguPages];
}
