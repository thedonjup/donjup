import { NextResponse } from "next/server";
import { verifyFirebaseAuth } from "@/lib/api/firebase-auth";
import { isAllowedSiteRequest } from "@/lib/api/site-origin";
import { parseCommentCreateRequest } from "@/lib/comment-request";
import {
  forgetCommentDedupe,
  shouldCreateComment,
} from "@/lib/comment-dedupe";
import { saveComment } from "@/lib/comment-store";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { serviceUnavailableResponse } from "@/lib/api/safe-error-response";

export async function POST(request: Request) {
  if (!isAllowedSiteRequest(request.headers)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authResult = await verifyFirebaseAuth(request);
  if (!authResult.ok) return authResult.response;

  const adminDb = getAdminFirestore();
  if (!adminDb) {
    return serviceUnavailableResponse();
  }

  const parsed = parseCommentCreateRequest(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const decoded = authResult.decoded;
  const dedupeInput = {
    uid: decoded.uid,
    aptSlug: parsed.aptSlug,
    text: parsed.text,
  };

  if (!shouldCreateComment(dedupeInput)) {
    return NextResponse.json({ ok: true });
  }

  try {
    await saveComment(adminDb, decoded, parsed);

    return NextResponse.json({ ok: true });
  } catch (e) {
    forgetCommentDedupe(dedupeInput);
    logger.error("Failed to create comment", { error: e, route: "/api/comments" });
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
