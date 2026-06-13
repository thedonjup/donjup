import { unstable_cache } from "next/cache";
import { searchNews, type NewsItem } from "@/lib/api/naver-news";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";

export const NEWS_SEARCH_TIMEOUT_MS = 5000;

export async function getNewsSearchResults(query: string): Promise<NewsItem[]> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), NEWS_SEARCH_TIMEOUT_MS);

  try {
    return await searchNews(query, ac.signal);
  } finally {
    clearTimeout(timer);
  }
}

export const getCachedNewsSearchResults = unstable_cache(
  getNewsSearchResults,
  ["news-search-results-v1"],
  {
    revalidate: 300,
    tags: [PUBLIC_DATA_CACHE_TAGS.NEWS],
  }
);
