export const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_GEOCODE_CACHE_ENTRIES = 500;
const SERVICE_UNAVAILABLE_ERROR = "Service temporarily unavailable";
const geocodeCache = new Map<string, { lat: number; lng: number; cachedAt: number }>();
const geocodeInFlight = new Map<string, Promise<GeocodeAddressResult>>();

type KakaoAddressResponse = {
  documents?: Array<{
    x?: string;
    y?: string;
  }>;
};

type GeocodeAddressOptions = {
  fetchAddress?: typeof fetch;
  now?: number;
  restKey?: string;
};

export type GeocodeAddressResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string; status: 404 | 500 | 502 | 503 };

function getCachedAddress(address: string, now: number): GeocodeAddressResult | null {
  const cached = geocodeCache.get(address);
  if (!cached || now - cached.cachedAt >= GEOCODE_CACHE_TTL_MS) {
    return null;
  }

  return { ok: true, lat: cached.lat, lng: cached.lng };
}

function setCachedAddress(
  address: string,
  value: { lat: number; lng: number },
  now: number
): void {
  if (!geocodeCache.has(address) && geocodeCache.size >= MAX_GEOCODE_CACHE_ENTRIES) {
    const oldestKey = geocodeCache.keys().next().value;
    if (typeof oldestKey === "string") {
      geocodeCache.delete(oldestKey);
    }
  }

  geocodeCache.set(address, { ...value, cachedAt: now });
}

async function fetchGeocodeAddress(
  address: string,
  {
    fetchAddress = fetch,
    now = Date.now(),
    restKey = process.env.KAKAO_REST_KEY,
  }: GeocodeAddressOptions
): Promise<GeocodeAddressResult> {
  if (!restKey) {
    return { ok: false, error: SERVICE_UNAVAILABLE_ERROR, status: 503 };
  }

  try {
    const res = await fetchAddress(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: { Authorization: `KakaoAK ${restKey}` },
      }
    );

    if (!res.ok) {
      return { ok: false, error: `Kakao API error: ${res.status}`, status: 502 };
    }

    const data = await res.json() as KakaoAddressResponse;
    const doc = data.documents?.[0];
    if (!doc) {
      return { ok: false, error: "Address not found", status: 404 };
    }

    const lat = Number(doc.y);
    const lng = Number(doc.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: "Invalid Kakao geocode response", status: 502 };
    }

    setCachedAddress(address, { lat, lng }, now);

    return { ok: true, lat, lng };
  } catch {
    return { ok: false, error: "Geocode request failed", status: 500 };
  }
}

export async function geocodeAddress(
  address: string,
  options: GeocodeAddressOptions = {}
): Promise<GeocodeAddressResult> {
  const now = options.now ?? Date.now();
  const cached = getCachedAddress(address, now);
  if (cached) return cached;

  const pending = geocodeInFlight.get(address);
  if (pending) return pending;

  const promise = fetchGeocodeAddress(address, { ...options, now });
  geocodeInFlight.set(address, promise);

  try {
    return await promise;
  } finally {
    geocodeInFlight.delete(address);
  }
}

export function resetGeocodeAddressCacheForTests(): void {
  geocodeCache.clear();
  geocodeInFlight.clear();
}
