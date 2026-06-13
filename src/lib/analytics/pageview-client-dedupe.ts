export const CLIENT_PAGEVIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

const STORAGE_PREFIX = "donjup:pageview:";

type PageviewStorage = Pick<Storage, "getItem" | "setItem">;

export function pageviewStorageKey(pagePath: string): string {
  return `${STORAGE_PREFIX}${pagePath}`;
}

export function shouldSendClientPageview({
  storage,
  pagePath,
  now = Date.now(),
}: {
  storage: PageviewStorage | null;
  pagePath: string;
  now?: number;
}): boolean {
  if (!storage) return true;

  const key = pageviewStorageKey(pagePath);
  try {
    const stored = storage.getItem(key);
    const previous = stored === null ? null : Number(stored);
    if (typeof previous === "number" && Number.isFinite(previous) && now - previous < CLIENT_PAGEVIEW_DEDUPE_WINDOW_MS) {
      return false;
    }

    storage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
}
