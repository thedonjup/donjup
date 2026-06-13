const DEFAULT_COMMENTS_LIMIT = 50;
const MAX_COMMENTS_LIMIT = 100;
const MAX_FIRESTORE_SEGMENT_LENGTH = 200;

interface ParsedDeleteRequest {
  ok: true;
  aptSlug: string;
  commentId: string;
}

interface InvalidDeleteRequest {
  ok: false;
  error: string;
}

export function parseDamCommentsLimit(value: string | null): number {
  if (!value) return DEFAULT_COMMENTS_LIMIT;
  if (!/^\d+$/.test(value)) return DEFAULT_COMMENTS_LIMIT;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return DEFAULT_COMMENTS_LIMIT;

  return Math.min(parsed, MAX_COMMENTS_LIMIT);
}

function parseFirestoreSegment(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_FIRESTORE_SEGMENT_LENGTH) return null;
  if (normalized !== value) return null;
  if (normalized === "." || normalized === "..") return null;
  if (normalized.includes("/") || /[\x00-\x1F\x7F]/.test(normalized)) return null;

  return normalized;
}

export function parseDamCommentDeleteRequest(
  body: unknown
): ParsedDeleteRequest | InvalidDeleteRequest {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const aptSlug = parseFirestoreSegment((body as { aptSlug?: unknown }).aptSlug);
  const commentId = parseFirestoreSegment((body as { commentId?: unknown }).commentId);

  if (!aptSlug || !commentId) {
    return { ok: false, error: "Invalid comment reference" };
  }

  return { ok: true, aptSlug, commentId };
}
