import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db/health";
import { logger } from "@/lib/logger";

export async function cronDatabaseGuard(cronName: string): Promise<NextResponse | null> {
  const result = await checkDatabaseHealth();
  if (result.body.ok) return null;

  logger.warn("Cron skipped because database is unavailable", {
    cron: cronName,
    code: result.body.code,
    status: result.status,
  });

  return NextResponse.json(
    {
      success: false,
      skipped: true,
      code: result.body.code,
      message: result.body.message,
    },
    {
      status: result.status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
