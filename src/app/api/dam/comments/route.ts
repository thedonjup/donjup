import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/api/admin-auth";
import {
  parseDamCommentDeleteRequest,
  parseDamCommentsLimit,
} from "@/lib/dam-comments-request";
import {
  deleteDamComment,
  getDamComments,
} from "@/lib/dam-comments-query";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { serviceUnavailableResponse } from "@/lib/api/safe-error-response";

export async function GET(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  const adminDb = getAdminFirestore();
  if (!adminDb) {
    return serviceUnavailableResponse();
  }

  const { searchParams } = new URL(request.url);
  const limit = parseDamCommentsLimit(searchParams.get("limit"));

  try {
    const comments = await getDamComments(adminDb, limit);

    return NextResponse.json({ comments });
  } catch (e) {
    logger.error("Failed to load DAM comments", { error: e, route: "/api/dam/comments" });
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  const adminDb = getAdminFirestore();
  if (!adminDb) {
    return serviceUnavailableResponse();
  }

  const parsed = parseDamCommentDeleteRequest(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await deleteDamComment(adminDb, parsed.aptSlug, parsed.commentId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("Failed to delete DAM comment", { error: e, route: "/api/dam/comments DELETE" });
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
