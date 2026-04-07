export interface RecentComplexItem {
  govtComplexId: string;
  aptName: string;
  regionName: string;
  viewedAt: number;
}

export const RECENT_COMPLEXES_KEY = "donjup-recent-complexes";
const MAX_RECENT = 8;

export function getRecentComplexes(): RecentComplexItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_COMPLEXES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentComplex(item: Omit<RecentComplexItem, "viewedAt">) {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentComplexes();
    const filtered = current.filter((x) => x.govtComplexId !== item.govtComplexId);
    const next: RecentComplexItem[] = [
      { ...item, viewedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_COMPLEXES_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage failures
  }
}
