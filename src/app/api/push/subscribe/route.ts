import { NextResponse } from "next/server";
import { isAllowedSiteOrigin } from "@/lib/api/site-origin";
import { logger } from "@/lib/logger";
import { parsePushSubscriptionRequest } from "@/lib/push-subscription-request";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  forgetPushSubscriptionDedupe,
  shouldStorePushSubscription,
} from "@/lib/push-subscription-dedupe";
import { savePushSubscription } from "@/lib/push-subscription-store";

export async function POST(request: Request) {
  if (!isAllowedSiteOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = parsePushSubscriptionRequest(await request.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!shouldStorePushSubscription(parsed)) {
      return NextResponse.json({ success: true });
    }

    try {
      await savePushSubscription(parsed);
    } catch (e) {
      forgetPushSubscriptionDedupe(parsed);

      const publicError = publicDatabaseError(e);

      logDatabaseFailure("Failed to save push subscription", e, {
        route: "/api/push/subscribe",
      });

      return NextResponse.json(
        { error: publicError.message, code: publicError.code },
        { status: publicError.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error("Unexpected error in push subscribe", { error: e, route: "/api/push/subscribe" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
