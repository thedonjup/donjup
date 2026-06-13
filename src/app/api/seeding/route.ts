import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";
import { parseSeedingQueueQuery } from "@/lib/seeding-query";
import { getPendingSeedingQueue } from "@/lib/seeding-queue-query";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const query = parseSeedingQueueQuery(searchParams);
  if (!query.ok) {
    return NextResponse.json({ error: query.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getPendingSeedingQueue(query));
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch seeding queue", e, {
      route: "/api/seeding",
      date: query.date,
      platform: query.platform,
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
