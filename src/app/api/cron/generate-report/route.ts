import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import { safeErrorMessage } from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { generateDailyReport } from "@/lib/cron-generate-report";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("generate-report");
  if (databaseUnavailable) return databaseUnavailable;

  try {
    const report = await generateDailyReport({ requestUrl: request.url });
    return NextResponse.json(report);
  } catch (e) {
    const msg = safeErrorMessage(e);
    logger.error("Generate-report failed", { error: e, cron: "generate-report" });
    await sendSlackAlert(`[generate-report] 실패: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
