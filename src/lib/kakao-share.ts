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

/** Kakao SDK init 보장 (한 번만 실행) */
export function ensureKakaoInit(): boolean {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return false;
  if (typeof window === "undefined" || !window.Kakao) return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
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

  if (!ensureKakaoInit()) {
    // SDK 미로드 시 fallback
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
}
