import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/api/admin-auth";
import { listAdminUsers } from "@/lib/admin-users-list";
import { parseAdminUsersQuery } from "@/lib/admin-users-query";
import { getAdminAuth } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { serviceUnavailableResponse } from "@/lib/api/safe-error-response";

export async function GET(request: Request) {
  const authError = await verifyAdminAuth(request);
  if (authError) return authError;

  const query = parseAdminUsersQuery(new URL(request.url).searchParams);
  if (!query) {
    return NextResponse.json({ error: "Invalid users query" }, { status: 400 });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return serviceUnavailableResponse();
  }

  try {
    return NextResponse.json(await listAdminUsers(adminAuth, query));
  } catch (e) {
    logger.error("Failed to list users", { error: e, route: "/api/admin/users" });
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}
