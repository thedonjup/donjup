import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {
  // --- Auth: verify caller is admin ---
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const adminAuth = getAdminAuth();

  if (!adminAuth) {
    return NextResponse.json(
      { error: "Firebase Admin SDK not configured" },
      { status: 503 },
    );
  }

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdmin(decoded.email ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // --- Fetch users ---
  try {
    const listResult = await adminAuth.listUsers(1000);
    const users = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      photoURL: u.photoURL ?? null,
      lastSignInTime: u.metadata.lastSignInTime ?? null,
      creationTime: u.metadata.creationTime ?? null,
    }));

    return NextResponse.json({ users, total: users.length });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to list users", detail: String(e) },
      { status: 500 },
    );
  }
}
