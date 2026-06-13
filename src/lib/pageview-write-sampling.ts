const DEFAULT_PAGEVIEW_WRITE_SAMPLE_RATE = 1;
const MIN_PAGEVIEW_WRITE_SAMPLE_RATE = 0;
const MAX_PAGEVIEW_WRITE_SAMPLE_RATE = 1;

function clampSampleRate(value: number): number {
  return Math.min(
    Math.max(value, MIN_PAGEVIEW_WRITE_SAMPLE_RATE),
    MAX_PAGEVIEW_WRITE_SAMPLE_RATE
  );
}

export function parsePageviewWriteSampleRate(value: string | undefined): number {
  if (!value) return DEFAULT_PAGEVIEW_WRITE_SAMPLE_RATE;

  const normalized = value.trim();
  if (!normalized) return DEFAULT_PAGEVIEW_WRITE_SAMPLE_RATE;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return DEFAULT_PAGEVIEW_WRITE_SAMPLE_RATE;

  return clampSampleRate(parsed);
}

export function pageviewWriteSampleRate(): number {
  return parsePageviewWriteSampleRate(
    process.env.DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE
  );
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function shouldSamplePageviewWrite({
  clientFingerprint,
  pagePath,
  sampleRate,
}: {
  clientFingerprint: string;
  pagePath: string;
  sampleRate: number;
}): boolean {
  if (sampleRate <= MIN_PAGEVIEW_WRITE_SAMPLE_RATE) return false;
  if (sampleRate >= MAX_PAGEVIEW_WRITE_SAMPLE_RATE) return true;

  const bucket = fnv1a(`${clientFingerprint}\u0000${pagePath}`) / 0xffffffff;
  return bucket < sampleRate;
}

export function pageviewWriteWeight(sampleRate: number): number {
  if (sampleRate <= MIN_PAGEVIEW_WRITE_SAMPLE_RATE) return 0;
  if (sampleRate >= MAX_PAGEVIEW_WRITE_SAMPLE_RATE) return 1;

  return Math.max(1, Math.round(1 / sampleRate));
}
