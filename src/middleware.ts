import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter
// 60 requests per minute per IP for API routes
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up expired entries to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit /api/ routes, excluding cron routes (they have CRON_SECRET auth)
  if (!pathname.startsWith("/api/") || pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  cleanup();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
