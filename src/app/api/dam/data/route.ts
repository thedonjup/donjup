import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/api/admin-auth";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { getDamDataChecks } from "@/lib/dam-dashboard-query";

export async function GET(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  try {
    return NextResponse.json(await getDamDataChecks());
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch DAM data checks", e, {
      route: "/api/dam/data",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
