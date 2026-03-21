import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://donjup.com";
  const supabase = createServiceClient();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/rate`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/rate/calculator`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/daily/archive`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
  ];

  // 데일리 리포트 페이지
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(90);

  const reportPages: MetadataRoute.Sitemap = (reports ?? []).map((r) => ({
    url: `${baseUrl}/daily/${r.report_date}`,
    lastModified: new Date(r.report_date),
    changeFrequency: "never" as const,
    priority: 0.6,
  }));

  // 아파트 단지 상세 페이지
  const { data: complexes } = await supabase
    .from("apt_complexes")
    .select("slug,region_code,updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  const complexPages: MetadataRoute.Sitemap = (complexes ?? []).map((c) => ({
    url: `${baseUrl}/apt/${c.region_code}/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...reportPages, ...complexPages];
}
