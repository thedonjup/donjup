import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/api/admin-auth";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  getDamContentItems,
  updateDamContentStatus,
} from "@/lib/dam-content-query";
import {
  parseContentStatusUpdate,
  parseContentTab,
} from "@/lib/dam-content-request";

export async function GET(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const tab = parseContentTab(searchParams.get("tab"));

  if (!tab) {
    return NextResponse.json({ error: "Invalid content tab" }, { status: 400 });
  }

  try {
    const items = await getDamContentItems(tab);

    return NextResponse.json({ items });
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch DAM content", e, {
      route: "/api/dam/content",
      tab,
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}

export async function PATCH(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  const parsed = parseContentStatusUpdate(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await updateDamContentStatus(parsed.id, parsed.status);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to update DAM content status", e, {
      route: "/api/dam/content",
      id: parsed.id,
      status: parsed.status,
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
