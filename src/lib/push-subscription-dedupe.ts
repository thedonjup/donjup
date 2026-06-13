export const PUSH_SUBSCRIPTION_DEDUPE_WINDOW_MS = 60_000;

const MAX_PUSH_SUBSCRIPTION_DEDUPE_KEYS = 5_000;
const pushSubscriptionDedupeUntil = new Map<string, number>();

type PushSubscriptionDedupeInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function dedupeKey(subscription: PushSubscriptionDedupeInput): string {
  return `${subscription.endpoint}\u0000${subscription.p256dh}\u0000${subscription.auth}`;
}

function pruneExpired(now: number): void {
  for (const [key, expiresAt] of pushSubscriptionDedupeUntil.entries()) {
    if (expiresAt <= now) {
      pushSubscriptionDedupeUntil.delete(key);
    }
  }

  while (pushSubscriptionDedupeUntil.size > MAX_PUSH_SUBSCRIPTION_DEDUPE_KEYS) {
    const oldest = pushSubscriptionDedupeUntil.keys().next().value;
    if (!oldest) return;
    pushSubscriptionDedupeUntil.delete(oldest);
  }
}

export function shouldStorePushSubscription(
  subscription: PushSubscriptionDedupeInput,
  now = Date.now()
): boolean {
  pruneExpired(now);

  const key = dedupeKey(subscription);
  const expiresAt = pushSubscriptionDedupeUntil.get(key);
  if (expiresAt && expiresAt > now) {
    return false;
  }

  pushSubscriptionDedupeUntil.set(key, now + PUSH_SUBSCRIPTION_DEDUPE_WINDOW_MS);
  return true;
}

export function forgetPushSubscriptionDedupe(
  subscription: PushSubscriptionDedupeInput
): void {
  pushSubscriptionDedupeUntil.delete(dedupeKey(subscription));
}

export function resetPushSubscriptionDedupeForTests(): void {
  pushSubscriptionDedupeUntil.clear();
}
