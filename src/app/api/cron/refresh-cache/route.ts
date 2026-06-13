import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import { safeErrorMessage } from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { refreshHomepageCache } from "@/lib/cron-refresh-homepage-cache";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("refresh-cache");
  if (databaseUnavailable) return databaseUnavailable;

  try {
    const result = await refreshHomepageCache();
    return NextResponse.json(result);
  } catch (error) {
    const msg = safeErrorMessage(error);
    logger.error("Refresh-cache failed", { error, cron: "refresh-cache" });
    await sendSlackAlert(`[refresh-cache] 실패: ${msg}`);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
