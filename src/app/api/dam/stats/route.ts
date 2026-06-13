import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/api/admin-auth";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { getDamStats } from "@/lib/dam-dashboard-query";

export async function GET(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  try {
    return NextResponse.json(await getDamStats());
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch DAM stats", e, {
      route: "/api/dam/stats",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
