const DEFAULT_APT_SITEMAP_COUNT = 1;
const MAX_APT_SITEMAP_COUNT = 100;

export function parseSitemapCount(
  rawValue: string | undefined,
  fallback = DEFAULT_APT_SITEMAP_COUNT
): number {
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, MAX_APT_SITEMAP_COUNT);
}

export function createSitemapIds(count: number): { id: number }[] {
  return Array.from({ length: count }, (_, id) => ({ id }));
}

export function createAptSitemapUrls(baseUrl: string, count: number): string[] {
  return createSitemapIds(count).map(({ id }) => `${baseUrl}/apt/sitemap/${id}.xml`);
}

export function createAptSitemapIndexUrl(baseUrl: string): string {
  return `${baseUrl}/apt-sitemap.xml`;
}

export function createDailySitemapUrl(baseUrl: string): string {
  return `${baseUrl}/daily-sitemap.xml`;
}
