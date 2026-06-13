import { NextResponse } from "next/server";
import { verifyMaintenanceAccess } from "@/lib/api/maintenance";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { backfillMissingGovtComplexIds } from "@/lib/backfill-govt-ids";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const accessError = verifyMaintenanceAccess(request);
  if (accessError) return accessError;

  try {
    return NextResponse.json(await backfillMissingGovtComplexIds());
  } catch (error) {
    const publicError = publicDatabaseError(error);

    logDatabaseFailure("Failed to backfill govt complex ids", error, {
      route: "/api/backfill-govt-id",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
