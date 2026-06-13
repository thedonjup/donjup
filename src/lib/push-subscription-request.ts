const MAX_ENDPOINT_LENGTH = 2048;
const MAX_P256DH_LENGTH = 512;
const MAX_AUTH_LENGTH = 256;
const PUSH_KEY_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

export type ParsedPushSubscription =
  | { ok: true; endpoint: string; p256dh: string; auth: string }
  | { ok: false; error: string };

function isPushKey(value: unknown, { min, max }: { min: number; max: number }): value is string {
  return (
    typeof value === "string" &&
    value.length >= min &&
    value.length <= max &&
    PUSH_KEY_PATTERN.test(value)
  );
}

function parseEndpoint(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_ENDPOINT_LENGTH) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function parsePushSubscriptionRequest(body: unknown): ParsedPushSubscription {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid subscription data" };
  }

  const record = body as Record<string, unknown>;
  const keys = record.keys;
  const keyRecord = keys && typeof keys === "object" && !Array.isArray(keys)
    ? keys as Record<string, unknown>
    : null;
  const endpoint = parseEndpoint(record.endpoint);

  if (
    !endpoint ||
    !keyRecord ||
    !isPushKey(keyRecord.p256dh, { min: 16, max: MAX_P256DH_LENGTH }) ||
    !isPushKey(keyRecord.auth, { min: 8, max: MAX_AUTH_LENGTH })
  ) {
    return { ok: false, error: "Invalid subscription data" };
  }

  return {
    ok: true,
    endpoint,
    p256dh: keyRecord.p256dh,
    auth: keyRecord.auth,
  };
}
