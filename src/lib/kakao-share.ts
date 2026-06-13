/**
 * 카카오톡 공유 유틸리티
 */

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share?: {
        sendDefault: (params: Record<string, unknown>) => void;
      };
    };
  }
}

/** Kakao SDK 동적 로드 + init (한 번만 실행) */
function loadKakaoSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key || typeof window === "undefined") { resolve(false); return; }

    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve(true);
      return;
    }

    if (!document.querySelector('script[src*="kakao_js_sdk"]')) {
      const script = document.createElement("script");
      script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
      script.crossOrigin = "";
      script.onload = () => {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key);
        resolve(!!window.Kakao);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    } else {
      // 이미 로딩 중 — 폴링
      const check = () => {
        if (window.Kakao) {
          if (!window.Kakao.isInitialized()) window.Kakao.init(key);
          resolve(true);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    }
  });
}

export function ensureKakaoInit(): boolean {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key || typeof window === "undefined" || !window.Kakao) return false;
  if (!window.Kakao.isInitialized()) window.Kakao.init(key);
  return true;
}

/** 카카오톡 피드 공유 */
export function shareViaKakao({
  title,
  description,
  imageUrl,
  url,
}: {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}) {
  const shareUrl = `${url}${url.includes("?") ? "&" : "?"}utm_source=kakao&utm_medium=share`;

  // SDK 동적 로드 후 공유
  loadKakaoSdk().then((ok) => {
    if (!ok || !window.Kakao?.Share) {
      window.open(
        `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
        "_blank",
      );
      return;
    }

  window.Kakao!.Share!.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl: imageUrl ?? "https://donjup.com/opengraph-image",
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: "시세 확인하기",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  });
  });
}
