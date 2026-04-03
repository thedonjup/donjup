import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting removed — in-memory Map resets on every serverless cold start,
// providing no real protection. Use Vercel WAF or Vercel Firewall Rules
// for production rate limiting instead.
// See: https://vercel.com/docs/security/vercel-waf

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // /apt/{region}/{slug} -> /apt/{govtComplexId} (308 Permanent Redirect)
  // region is always a 5-digit code, slug is aptSeq (numeric) or Korean name
  const aptMatch = pathname.match(/^\/apt\/(\d{5})\/(.+)$/);
  if (aptMatch) {
    const [, region, rawSlug] = aptMatch;
    const slug = decodeURIComponent(rawSlug);
    // Numeric slug = aptSeq -> govtComplexId = "{region}-{aptSeq}"
    if (/^\d+$/.test(slug)) {
      return NextResponse.redirect(
        new URL(`/apt/${region}-${slug}`, request.url),
        308
      );
    }
    // Non-numeric slug (Korean name) — redirect to govtComplexId format
    // After backfill, these should not exist. For now, try region-slug pattern
    return NextResponse.redirect(
      new URL(`/apt/${region}-${slug}`, request.url),
      308
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/apt/:region/:slug*"],
};
