import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import {
  safeErrorMessage,
  serviceUnavailableResponse,
} from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { hasPushVapidConfig, sendDailyReportPush } from "@/lib/cron-send-push";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("send-push");
  if (databaseUnavailable) return databaseUnavailable;

  if (
    !hasPushVapidConfig()
  ) {
    return serviceUnavailableResponse();
  }

  try {
    const result = await sendDailyReportPush();
    return NextResponse.json(result);
  } catch (e) {
    const msg = safeErrorMessage(e);
    logger.error("Send-push failed", { error: e, cron: "send-push" });
    await sendSlackAlert(`[send-push] 실패: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
