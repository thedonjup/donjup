import { NextResponse } from "next/server";
import { verifyMaintenanceAccess } from "@/lib/api/maintenance";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { getDebugAptSnapshot } from "@/lib/debug-apt-query";
import { parseDebugAptQuery } from "@/lib/debug-apt-request";

export async function GET(request: Request) {
  const accessError = verifyMaintenanceAccess(request);
  if (accessError) return accessError;

  const { searchParams } = new URL(request.url);
  const query = parseDebugAptQuery(searchParams);
  if (!query.ok) {
    return NextResponse.json({ error: query.error }, { status: 400 });
  }

  try {
    const snapshot = await getDebugAptSnapshot(query.slug);

    if (!snapshot) {
      return NextResponse.json(
        { error: "Complex not found", slug: query.slug, step: "complex_lookup" },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    const publicError = publicDatabaseError(error);

    logDatabaseFailure("Debug apt route failed", error, {
      route: "/api/debug-apt",
      slug: query.slug,
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
