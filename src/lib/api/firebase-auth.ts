import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  serviceUnavailableResponse,
  unauthorizedResponse,
} from "@/lib/api/safe-error-response";
import type { NextResponse } from "next/server";

type FirebaseAuthResult =
  | { ok: true; decoded: DecodedIdToken }
  | { ok: false; response: NextResponse };

export async function verifyFirebaseAuth(request: Request): Promise<FirebaseAuthResult> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return {
      ok: false,
      response: unauthorizedResponse(),
    };
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return {
      ok: false,
      response: serviceUnavailableResponse(),
    };
  }

  try {
    return { ok: true, decoded: await adminAuth.verifyIdToken(token) };
  } catch {
    return {
      ok: false,
      response: unauthorizedResponse(),
    };
  }
}
