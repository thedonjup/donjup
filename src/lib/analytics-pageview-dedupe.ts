export const PAGEVIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

const MAX_PAGEVIEW_DEDUPE_KEYS = 5_000;
const pageviewDedupeUntil = new Map<string, number>();

function firstForwardedIp(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

function pruneExpired(now: number): void {
  for (const [key, expiresAt] of pageviewDedupeUntil.entries()) {
    if (expiresAt <= now) {
      pageviewDedupeUntil.delete(key);
    }
  }

  while (pageviewDedupeUntil.size > MAX_PAGEVIEW_DEDUPE_KEYS) {
    const oldest = pageviewDedupeUntil.keys().next().value;
    if (!oldest) return;
    pageviewDedupeUntil.delete(oldest);
  }
}

export function pageviewClientFingerprint(headers: Headers): string {
  const ip =
    firstForwardedIp(headers.get("x-forwarded-for")) ??
    headers.get("x-real-ip")?.trim() ??
    headers.get("cf-connecting-ip")?.trim() ??
    "unknown";
  const userAgent = headers.get("user-agent")?.trim().slice(0, 128) || "unknown";

  return `${ip}|${userAgent}`;
}

export function shouldRecordPageview({
  clientFingerprint,
  pagePath,
  now = Date.now(),
}: {
  clientFingerprint: string;
  pagePath: string;
  now?: number;
}): boolean {
  pruneExpired(now);

  const key = `${clientFingerprint}\u0000${pagePath}`;
  const expiresAt = pageviewDedupeUntil.get(key);
  if (expiresAt && expiresAt > now) {
    return false;
  }

  pageviewDedupeUntil.set(key, now + PAGEVIEW_DEDUPE_WINDOW_MS);
  return true;
}

export function resetPageviewDedupeForTests(): void {
  pageviewDedupeUntil.clear();
}
