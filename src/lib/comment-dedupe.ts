export const COMMENT_DEDUPE_WINDOW_MS = 60_000;

const MAX_COMMENT_DEDUPE_KEYS = 5_000;
const commentDedupeUntil = new Map<string, number>();

export type CommentDedupeInput = {
  uid: string;
  aptSlug: string;
  text: string;
};

function dedupeKey(comment: CommentDedupeInput): string {
  return `${comment.uid}\u0000${comment.aptSlug}\u0000${comment.text}`;
}

function pruneExpired(now: number): void {
  for (const [key, expiresAt] of commentDedupeUntil.entries()) {
    if (expiresAt <= now) {
      commentDedupeUntil.delete(key);
    }
  }

  while (commentDedupeUntil.size > MAX_COMMENT_DEDUPE_KEYS) {
    const oldest = commentDedupeUntil.keys().next().value;
    if (!oldest) return;
    commentDedupeUntil.delete(oldest);
  }
}

export function shouldCreateComment(
  comment: CommentDedupeInput,
  now = Date.now()
): boolean {
  pruneExpired(now);

  const key = dedupeKey(comment);
  const expiresAt = commentDedupeUntil.get(key);
  if (expiresAt && expiresAt > now) {
    return false;
  }

  commentDedupeUntil.set(key, now + COMMENT_DEDUPE_WINDOW_MS);
  return true;
}

export function forgetCommentDedupe(comment: CommentDedupeInput): void {
  commentDedupeUntil.delete(dedupeKey(comment));
}

export function resetCommentDedupeForTests(): void {
  commentDedupeUntil.clear();
}
