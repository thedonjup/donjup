import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APT_LEGACY_IDENTITY_REDIRECTS = new Map([
  [
    "/apt/11230-답십리동-두산",
    "/apt/natural-11230-답십리동-두산-2000-1",
  ],
]);

function decodedPath(pathname: string): string {
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const directTarget = APT_LEGACY_IDENTITY_REDIRECTS.get(decodedPath(pathname));
  if (directTarget) {
    return NextResponse.redirect(new URL(directTarget, request.url), 308);
  }

  const aptMatch = pathname.match(/^\/apt\/(\d{5})\/(.+)$/);
  if (!aptMatch) {
    return NextResponse.next();
  }

  const [, region, rawSlug] = aptMatch;
  const slug = decodeURIComponent(rawSlug);
  const legacyPath = `/apt/${region}-${slug}`;
  const targetPath = APT_LEGACY_IDENTITY_REDIRECTS.get(legacyPath) ?? legacyPath;

  return NextResponse.redirect(
    new URL(targetPath, request.url),
    308
  );
}

export const config = {
  matcher: ["/apt/:id", "/apt/:region/:slug*"],
};
