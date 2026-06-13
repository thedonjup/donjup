const CONTENT_TABS = ["cardnews", "seeding", "insta"] as const;
const CONTENT_STATUSES = ["pending", "ready", "posted", "hold", "deleted", "failed"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ContentTab = (typeof CONTENT_TABS)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type ParsedContentStatusUpdate =
  | { ok: true; id: string; status: ContentStatus }
  | { ok: false; error: string };

export function parseContentTab(value: string | null | undefined): ContentTab | null {
  if (!value) return "cardnews";

  const tab = value.trim();
  return (CONTENT_TABS as readonly string[]).includes(tab) ? (tab as ContentTab) : null;
}

export function parseContentStatusUpdate(body: unknown): ParsedContentStatusUpdate {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "id and status required" };
  }

  const record = body as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const status = typeof record.status === "string" ? record.status.trim() : "";

  if (!UUID_PATTERN.test(id)) {
    return { ok: false, error: "Invalid content id" };
  }

  if (!(CONTENT_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Invalid content status" };
  }

  return { ok: true, id, status: status as ContentStatus };
}
