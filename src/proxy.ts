import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting removed — in-memory Map resets on every serverless cold start,
// providing no real protection. Use Vercel WAF or Vercel Firewall Rules
// for production rate limiting instead.
// See: https://vercel.com/docs/security/vercel-waf

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
