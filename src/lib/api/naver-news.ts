/**
 * 뉴스 검색 API - Google News RSS fallback
 *
 * Naver Search API를 우선 사용하되, 키가 없으면 Google News RSS로 대체.
 * 결과는 6시간 동안 메모리 캐싱.
 */

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string;
}

// --- In-memory cache (6 hours) ---
const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { items: NewsItem[]; expires: number }>();

function getCached(key: string): NewsItem[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.items;
}

function setCache(key: string, items: NewsItem[]) {
  cache.set(key, { items, expires: Date.now() + CACHE_TTL });

  // 캐시 크기 제한 (최대 200개)
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

// --- Naver Search API ---
async function fetchNaverNews(
  query: string,
  signal?: AbortSignal
): Promise<NewsItem[] | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=5&sort=date`;
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    return (data.items ?? []).slice(0, 5).map(
      (item: {
        title: string;
        originallink: string;
        link: string;
        description: string;
        pubDate: string;
      }) => ({
        title: stripHtml(item.title),
        link: item.originallink || item.link,
        source: extractDomain(item.originallink || item.link),
        pubDate: item.pubDate,
        description: stripHtml(item.description),
      })
    );
  } catch {
    return null;
  }
}

// --- Google News RSS fallback ---
async function fetchGoogleNewsRss(
  query: string,
  signal?: AbortSignal
): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(url, { signal });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseRssXml(xml).slice(0, 5);
  } catch {
    return [];
  }
}

/** 간단한 RSS XML 파서 (외부 의존성 없음) */
function parseRssXml(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");
    const source = extractTag(block, "source") || extractDomain(link);

    if (title && link) {
      items.push({
        title: stripHtml(title),
        link,
        source,
        pubDate: pubDate || "",
        description: stripHtml(description),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  // CDATA 처리
  const cdataRe = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(xml);
  return m ? m[1].trim() : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// --- Public API ---
export async function searchNews(
  query: string,
  signal?: AbortSignal
): Promise<NewsItem[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Naver API 우선, 없으면 Google RSS
  const results =
    (await fetchNaverNews(query, signal)) ??
    (await fetchGoogleNewsRss(query, signal));

  setCache(cacheKey, results);
  return results;
}
