const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
const STORAGE_KEY = "donjup_utm";

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/** URL 파라미터에서 UTM 데이터를 읽어 localStorage에 저장 */
export function captureUtm(): UtmData | null {
  if (typeof window === "undefined") return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const utm: UtmData = {};
    let hasUtm = false;

    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) {
        utm[key] = value;
        hasUtm = true;
      }
    }

    if (hasUtm) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
      return utm;
    }

    // URL에 UTM이 없으면 기존 저장값 반환
    return getStoredUtm();
  } catch {
    return null;
  }
}

/** localStorage에서 저장된 UTM 데이터 조회 */
export function getStoredUtm(): UtmData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UtmData;
  } catch {
    return null;
  }
}
