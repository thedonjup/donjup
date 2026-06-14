import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const aptMatch = pathname.match(/^\/apt\/(\d{5})\/(.+)$/);
  if (!aptMatch) {
    return NextResponse.next();
  }

  const [, region, rawSlug] = aptMatch;
  const slug = decodeURIComponent(rawSlug);

  return NextResponse.redirect(
    new URL(`/apt/${region}-${slug}`, request.url),
    308
  );
}

export const config = {
  matcher: ["/apt/:region/:slug*"],
};
