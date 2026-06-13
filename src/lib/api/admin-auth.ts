import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { verifyFirebaseAuth } from "@/lib/api/firebase-auth";

export async function verifyAdminAuth(
  request: Request
): Promise<NextResponse | null> {
  const authResult = await verifyFirebaseAuth(request);
  if (!authResult.ok) return authResult.response;

  if (!isAdmin(authResult.decoded.email ?? null)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
