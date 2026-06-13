import type { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { serviceUnavailableResponse } from "@/lib/api/safe-error-response";

const ENABLED_VALUE = "true";

export function maintenanceRoutesEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.DONJUP_ENABLE_MAINTENANCE_ROUTES === ENABLED_VALUE;
}

export function verifyMaintenanceAccess(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): NextResponse | null {
  const authError = verifyCronAuth(request, env);
  if (authError) return authError;

  if (!maintenanceRoutesEnabled(env)) {
    return serviceUnavailableResponse();
  }

  return null;
}
