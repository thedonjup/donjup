import { normalizePublicQuery } from "@/lib/public-query";

const MAX_APT_LOOKUP_ID_LENGTH = 160;

export function parseAptLookupId(value: string | null | undefined): string | null {
  const id = normalizePublicQuery(value);

  if (!id || id.length > MAX_APT_LOOKUP_ID_LENGTH) {
    return null;
  }

  return id;
}
