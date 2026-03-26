import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  // Scripts: Next.js inline scripts + CDN dependencies
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dapi.kakao.com https://t1.kakaocdn.net https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com https://static.nid.naver.com https://connect.facebook.net https://*.googlesyndication.com",
  // Styles: Tailwind + Google Fonts + inline styles
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: allow all (apt images come from various CDN sources)
  "img-src 'self' data: blob: https: http:",
  // Connect: Firebase, GA, Kakao APIs, own API
  "connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseapp.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://dapi.kakao.com https://pagead2.googlesyndication.com wss://*.firebaseio.com",
  // Frames: AdSense iframes
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  // Media
  "media-src 'self'",
  // Workers (Next.js service worker for PWA)
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "postgres"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
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
    ];
  },
};

export default nextConfig;
