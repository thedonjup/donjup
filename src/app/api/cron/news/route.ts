import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  let inserted = 0;
  const errors: string[] = [];

  try {
    // 네이버 부동산 뉴스 RSS 수집
    const RSS_URL = "https://news.google.com/rss/search?q=%EB%B6%80%EB%8F%99%EC%82%B0+%EC%95%84%ED%8C%8C%ED%8A%B8+%EC%8B%A4%EA%B1%B0%EB%9E%98%EA%B0%80&hl=ko&gl=KR&ceid=KR:ko";

    const res = await fetch(RSS_URL, { next: { revalidate: 0 } });
    if (!res.ok) {
      throw new Error(`RSS fetch failed: ${res.status}`);
    }

    const xml = await res.text();

    // 간단한 RSS XML 파싱
    const items: { title: string; link: string; pubDate: string; source: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1];
      const title = content.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim() || "";
      const link = content.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
      const pubDate = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      const source = content.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").trim() || "Google News";

      if (title && link) {
        items.push({ title, link, pubDate, source });
      }
    }

    // DB에 저장 (news 테이블 없으면 생성)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        link TEXT NOT NULL UNIQUE,
        source TEXT,
        published_at TIMESTAMPTZ,
        collected_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    for (const item of items.slice(0, 30)) {
      try {
        const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : null;
        await pool.query(
          `INSERT INTO news (title, link, source, published_at) VALUES ($1, $2, $3, $4) ON CONFLICT (link) DO NOTHING`,
          [item.title, item.link, item.source, pubDate]
        );
        inserted++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  if (errors.length > 0) {
    logger.error("News cron had errors", { errorCount: errors.length, cron: "news" });
    await sendSlackAlert(`[news] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    message: `뉴스 ${inserted}건 수집 완료`,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
