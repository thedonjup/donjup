import { describe, expect, it } from "vitest";
import {
  createCoreFeedItems,
  createRssFeed,
  escapeRssXml,
  RSS_XML_CONTENT_TYPE,
} from "@/lib/rss-feed";

describe("RSS feed helpers", () => {
  it("escapes XML-sensitive characters", () => {
    expect(escapeRssXml(`돈줍 <실거래> & "전세" '갭'`)).toBe(
      "돈줍 &lt;실거래&gt; &amp; &quot;전세&quot; &apos;갭&apos;",
    );
  });

  it("creates a stable RSS document", () => {
    const xml = createRssFeed({
      baseUrl: "https://donjup.com",
      lastBuildDate: new Date("2026-06-27T00:00:00Z"),
      items: [
        {
          title: "답십리 <두산>",
          url: "https://donjup.com/apt/sample",
          description: "전세가율 & 갭",
          pubDate: "2026-06-26",
        },
      ],
    });

    expect(RSS_XML_CONTENT_TYPE).toContain("application/rss+xml");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("답십리 &lt;두산&gt;");
    expect(xml).toContain("전세가율 &amp; 갭");
  });

  it("keeps low-cost core landing links in the feed", () => {
    const urls = createCoreFeedItems().map((item) => item.url);

    expect(urls).toContain("https://donjup.com/today");
    expect(urls).toContain("https://donjup.com/new-highs");
    expect(urls).toContain("https://donjup.com/rent");
    expect(urls).toContain("https://donjup.com/rate");
  });
});
