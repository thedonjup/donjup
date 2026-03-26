import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import { logger } from "@/lib/logger";

const ALLOWED_ORIGINS = [
  "https://donjup.com",
  "https://www.donjup.com",
];

export async function POST(request: Request) {
  // Origin validation
  const origin = request.headers.get("origin");
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { endpoint, keys } = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

    // Input validation
    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof keys?.p256dh !== "string" ||
      !keys.p256dh ||
      typeof keys?.auth !== "string" ||
      !keys.auth
    ) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: "endpoint", ignoreDuplicates: true }
    );

    if (error) {
      logger.error("Failed to save push subscription", { error, route: "/api/push/subscribe" });
      return NextResponse.json(
        { error: "서버 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error("Unexpected error in push subscribe", { error: e, route: "/api/push/subscribe" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
