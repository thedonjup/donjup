import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import { safeErrorMessage } from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { generateDailyCardnews } from "@/lib/cron-generate-cardnews";

export const maxDuration = 60;

async function handleGenerateCardNews(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const databaseUnavailable = await cronDatabaseGuard("generate-cardnews");
  if (databaseUnavailable) return databaseUnavailable;

  try {
    const result = await generateDailyCardnews();

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    const msg = safeErrorMessage(e);
    logger.error("Generate-cardnews failed", { error: e, cron: "generate-cardnews" });
    await sendSlackAlert(`[cron] generate-cardnews fail: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleGenerateCardNews(request);
}

export async function POST(request: Request) {
  return handleGenerateCardNews(request);
}
