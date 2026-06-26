const RSS_XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

export const RSS_XML_CONTENT_TYPE = "application/rss+xml; charset=utf-8";
export const DONJUP_FEED_TITLE = "돈줍 부동산 실거래가 리포트";
export const DONJUP_FEED_DESCRIPTION =
  "전국 아파트 실거래가, 전월세, 금리, 시장 리포트를 돈줍에서 확인하세요.";

export type RssFeedItem = {
  title: string;
  url: string;
  description: string;
  pubDate?: Date | string | null;
};

export function escapeRssXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeRssDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

function createItemXml(item: RssFeedItem): string {
  const pubDate = normalizeRssDate(item.pubDate);
  const lines = [
    "    <item>",
    `      <title>${escapeRssXml(item.title)}</title>`,
    `      <link>${escapeRssXml(item.url)}</link>`,
    `      <guid isPermaLink="true">${escapeRssXml(item.url)}</guid>`,
    `      <description>${escapeRssXml(item.description)}</description>`,
  ];

  if (pubDate) {
    lines.push(`      <pubDate>${escapeRssXml(pubDate)}</pubDate>`);
  }

  lines.push("    </item>");
  return lines.join("\n");
}

export function createCoreFeedItems(baseUrl = "https://donjup.com"): RssFeedItem[] {
  return [
    {
      title: "오늘의 아파트 실거래가",
      url: `${baseUrl}/today`,
      description: "오늘 수집된 아파트 매매 하락 거래와 주요 실거래 신호를 확인하세요.",
    },
    {
      title: "오늘의 신고가 아파트",
      url: `${baseUrl}/new-highs`,
      description: "최근 신고가를 기록한 아파트 단지를 한눈에 확인하세요.",
    },
    {
      title: "전국 아파트 전월세 실거래가",
      url: `${baseUrl}/rent`,
      description: "전세 보증금 상위 단지와 최근 월세 거래를 함께 확인하세요.",
    },
    {
      title: "주택담보대출 금리 현황",
      url: `${baseUrl}/rate`,
      description: "기준금리, COFIX, 은행별 주담대 금리와 계산기를 확인하세요.",
    },
  ];
}

export function createRssFeed({
  baseUrl = "https://donjup.com",
  items,
  lastBuildDate = new Date(),
}: {
  baseUrl?: string;
  items: RssFeedItem[];
  lastBuildDate?: Date;
}): string {
  return [
    RSS_XML_HEADER,
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeRssXml(DONJUP_FEED_TITLE)}</title>`,
    `    <link>${escapeRssXml(baseUrl)}</link>`,
    `    <description>${escapeRssXml(DONJUP_FEED_DESCRIPTION)}</description>`,
    "    <language>ko-KR</language>",
    `    <lastBuildDate>${escapeRssXml(lastBuildDate.toUTCString())}</lastBuildDate>`,
    ...items.map(createItemXml),
    "  </channel>",
    "</rss>",
  ].join("\n");
}
