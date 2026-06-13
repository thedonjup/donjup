import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import { safeErrorMessage } from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { postReadyCardnewsToInstagram } from "@/lib/cron-post-instagram";

export const maxDuration = 120;

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("post-instagram");
  if (databaseUnavailable) return databaseUnavailable;

  try {
    const result = await postReadyCardnewsToInstagram();

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    const msg = safeErrorMessage(e);
    logger.error("Post-instagram failed", { error: e, cron: "post-instagram" });
    await sendSlackAlert(`[post-instagram] fail: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
