import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function savePushSubscription(
  subscription: PushSubscriptionInput
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    })
    .onConflictDoNothing();
}
