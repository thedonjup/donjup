export type AptAlertItem = {
  contentId: string;
  aptName: string;
  latestPrice?: number;
  createdAt: string;
};

const MAX_ALERTS = 50;

function isAlertItem(value: unknown): value is AptAlertItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<AptAlertItem>;
  return (
    typeof item.contentId === "string" &&
    item.contentId.length > 0 &&
    typeof item.aptName === "string" &&
    item.aptName.length > 0 &&
    typeof item.createdAt === "string" &&
    (item.latestPrice === undefined || typeof item.latestPrice === "number")
  );
}

export function parseAptAlerts(raw: string | null): AptAlertItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAlertItem).slice(0, MAX_ALERTS) : [];
  } catch {
    return [];
  }
}

export function hasAptAlert(alerts: AptAlertItem[], contentId: string): boolean {
  return alerts.some((alert) => alert.contentId === contentId);
}

export function upsertAptAlert(
  alerts: AptAlertItem[],
  item: Omit<AptAlertItem, "createdAt"> & { createdAt?: string },
): AptAlertItem[] {
  const nextItem: AptAlertItem = {
    ...item,
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
  const remaining = alerts.filter((alert) => alert.contentId !== item.contentId);
  return [nextItem, ...remaining].slice(0, MAX_ALERTS);
}

export function removeAptAlert(alerts: AptAlertItem[], contentId: string): AptAlertItem[] {
  return alerts.filter((alert) => alert.contentId !== contentId);
}
