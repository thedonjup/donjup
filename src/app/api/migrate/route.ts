import { NextResponse } from "next/server";
import { verifyMaintenanceAccess } from "@/lib/api/maintenance";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { runMaintenanceMigration } from "@/lib/maintenance-migration";

export async function POST(request: Request) {
  const accessError = verifyMaintenanceAccess(request);
  if (accessError) return accessError;

  try {
    const result = await runMaintenanceMigration();

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const publicError = publicDatabaseError(error);

    logDatabaseFailure("Failed to run maintenance migration", error, {
      route: "/api/migrate",
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
