import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentQueue } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isAdmin } from "@/lib/admin/auth";

async function verifyAdminToken(request: NextRequest): Promise<{ ok: boolean; response?: NextResponse }> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return { ok: false, response: NextResponse.json({ error: "Firebase Admin SDK not configured" }, { status: 503 }) };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdmin(decoded.email ?? null)) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }

  return { ok: true };
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.ok) return auth.response!;

  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "cardnews";

    let whereClause;
    if (tab === "cardnews") {
      whereClause = eq(contentQueue.contentType, "cardnews");
    } else if (tab === "seeding") {
      whereClause = eq(contentQueue.contentType, "seeding");
    } else {
      // insta tab: cardnews that have been posted
      whereClause = and(
        eq(contentQueue.contentType, "cardnews"),
        eq(contentQueue.status, "posted")
      );
    }

    const items = await db
      .select({
        id: contentQueue.id,
        title: contentQueue.caption,
        status: contentQueue.status,
        platform: contentQueue.platformId,
        created_at: contentQueue.createdAt,
        content_type: contentQueue.contentType,
      })
      .from(contentQueue)
      .where(whereClause)
      .orderBy(desc(contentQueue.createdAt))
      .limit(50);

    return NextResponse.json({ items });
  } catch (e) {
    logger.error("Unexpected error in dam content GET", { error: e, route: "/api/dam/content" });
    return NextResponse.json({ items: [], error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.ok) return auth.response!;

  try {
    const body = await request.json();
    const { id, status } = body as { id: string; status: string };

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    try {
      await db
        .update(contentQueue)
        .set({ status })
        .where(eq(contentQueue.id, id));
    } catch (e) {
      logger.error("Failed to update dam content status", { error: e, route: "/api/dam/content PATCH" });
      return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("Unexpected error in dam content PATCH", { error: e, route: "/api/dam/content PATCH" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
