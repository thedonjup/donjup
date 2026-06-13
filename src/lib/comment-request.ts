const MAX_COMMENT_TEXT_LENGTH = 200;
const MAX_FIRESTORE_SEGMENT_LENGTH = 200;

interface ParsedCommentCreateRequest {
  ok: true;
  aptSlug: string;
  text: string;
}

interface InvalidCommentCreateRequest {
  ok: false;
  error: string;
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

function parseCommentText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized || normalized.length > MAX_COMMENT_TEXT_LENGTH) return null;
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(normalized)) return null;

  return normalized;
}

export function parseCommentCreateRequest(
  body: unknown
): ParsedCommentCreateRequest | InvalidCommentCreateRequest {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const aptSlug = parseFirestoreSegment((body as { aptSlug?: unknown }).aptSlug);
  if (!aptSlug) {
    return { ok: false, error: "Invalid apartment reference" };
  }

  const text = parseCommentText((body as { text?: unknown }).text);
  if (!text) {
    return { ok: false, error: "Invalid comment text" };
  }

  return { ok: true, aptSlug, text };
}
