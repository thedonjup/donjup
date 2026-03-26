import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "cardnews";

    let query = db
      .from("content_queue")
      .select("id, title, status, platform, created_at, content_type")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "cardnews") {
      query = query.eq("content_type", "cardnews");
    } else if (tab === "seeding") {
      query = query.eq("content_type", "seeding");
    } else {
      // insta tab: cardnews that have been posted
      query = query.eq("content_type", "cardnews").eq("status", "posted");
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Failed to fetch dam content", { error, route: "/api/dam/content" });
      return NextResponse.json({ items: [], error: "서버 오류가 발생했습니다" }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    logger.error("Unexpected error in dam content GET", { error: e, route: "/api/dam/content" });
    return NextResponse.json({ items: [], error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = createServiceClient();
    const body = await request.json();
    const { id, status } = body as { id: number; status: string };

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    const { error } = await db
      .from("content_queue")
      .update({ status })
      .eq("id", id);

    if (error) {
      logger.error("Failed to update dam content status", { error, route: "/api/dam/content PATCH" });
      return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("Unexpected error in dam content PATCH", { error: e, route: "/api/dam/content PATCH" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
