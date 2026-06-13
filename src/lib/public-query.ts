export type TextQueryOptions = {
  minLength: number;
  maxLength: number;
};

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function normalizePublicQuery(value: string | null | undefined): string {
  return (value ?? "")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBoundedTextQuery(
  value: string | null | undefined,
  { minLength, maxLength }: TextQueryOptions
): string | null {
  const normalized = normalizePublicQuery(value);

  if (normalized.length < minLength || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}
