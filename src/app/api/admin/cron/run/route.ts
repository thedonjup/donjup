import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/api/admin-auth";
import {
  getAdminCronSecret,
  runAdminCronRoute,
} from "@/lib/admin-cron-runner";
import { normalizeAdminCronRoute } from "@/lib/admin-cron-route";
import { serviceUnavailableResponse } from "@/lib/api/safe-error-response";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  const cronSecret = getAdminCronSecret();
  if (!cronSecret) {
    return serviceUnavailableResponse();
  }

  const body = await request.json().catch(() => null);
  const route = normalizeAdminCronRoute(body?.route);

  if (!route) {
    return NextResponse.json({ error: "Invalid cron route" }, { status: 400 });
  }

  try {
    const result = await runAdminCronRoute({
      cronSecret,
      requestUrl: request.url,
      route,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : result.status,
    });
  } catch (e) {
    logger.error("Failed to run admin cron", {
      error: e,
      route: "/api/admin/cron/run",
      cronRoute: route,
    });

    return NextResponse.json(
      {
        success: false,
        route,
        status: 502,
        result: { error: "Failed to run cron route" },
      },
      { status: 502 }
    );
  }
}
