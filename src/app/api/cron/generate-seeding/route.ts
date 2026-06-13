import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import { safeErrorMessage } from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { generateDailyReportSeeding } from "@/lib/cron-generate-seeding";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("generate-seeding");
  if (databaseUnavailable) return databaseUnavailable;

  try {
    const result = await generateDailyReportSeeding();
    if (!result.success) {
      const { status, ...body } = result;
      return NextResponse.json(body, { status });
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = safeErrorMessage(e);
    logger.error("Generate-seeding failed", { error: e, cron: "generate-seeding" });
    await sendSlackAlert(`[generate-seeding] 실패: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
