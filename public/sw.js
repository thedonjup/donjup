const CACHE_NAME = "donjup-v3";

// Install: 즉시 활성화 (대기 없음)
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate: 이전 캐시 전부 삭제 + 즉시 제어
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: 네트워크 전용 (캐시 사용 안 함)
// HTML, RSC, API 모두 항상 최신 버전을 서버에서 가져옴
// 오프라인일 때만 fallback 제공
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // _next/static 정적 파일만 캐시 (해시된 파일명이라 버전 충돌 없음)
  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.startsWith("/_next/static/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML, RSC, API → 항상 네트워크 우선, 오프라인 시 fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오프라인 - 돈줍</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;text-align:center;padding:1rem}h1{font-size:1.25rem;margin-bottom:0.5rem}p{color:#94a3b8;font-size:0.875rem}</style></head><body><div><h1>돈줍</h1><p>인터넷 연결이 필요합니다. 연결 후 다시 시도해주세요.</p></div></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          )
      )
    );
    return;
  }

  // 그 외 (API, RSC 등) → 네트워크만 사용
});

// Push notification
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "돈줍";
  const options = {
    body: data.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
