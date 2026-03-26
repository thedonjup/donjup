import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://dapi.kakao.com",
    "https://t1.kakaocdn.net",
    "https://t1.daumcdn.net",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://pagead2.googlesyndication.com",
    "https://adservice.google.com",
    "https://adservice.google.co.kr",
    "https://static.nid.naver.com",
    "https://connect.facebook.net",
    "https://va.vercel-scripts.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
  [
    "connect-src 'self'",
    "https://dapi.kakao.com",
    "https://kapi.kakao.com",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://stats.g.doubleclick.net",
    "https://firestore.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://www.googleapis.com",
    "https://*.firebase.com",
    "https://*.firebaseapp.com",
    "https://pagead2.googlesyndication.com",
    "https://adservice.google.com",
    "wss://*.firebaseio.com",
    "https://*.supabase.co",
    "https://vercel.live",
    "https://va.vercel-scripts.com",
  ].join(" "),
  [
    "frame-src 'self'",
    "https://accounts.google.com",
    "https://tpc.googlesyndication.com",
    "https://googleads.g.doubleclick.net",
    "https://www.google.com",
    "https://vercel.live",
  ].join(" "),
  "media-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "postgres"],
  async headers() {
    return [
      {
        // HTML 페이지 — 캐시하지 않음 (배포 후 즉시 새 버전 제공)
        source: "/((?!_next/static|_next/image|favicon).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // SW 파일 — 캐시하지 않음 (업데이트 즉시 반영)
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
