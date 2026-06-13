import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

const DISTRICT_SUFFIX_PATTERN = /[\uAD6C\uC2DC\uAD70]$/;

const regionSearchMap: Record<string, string> = {};

function addRegionAlias(alias: string, code: string): void {
  const key = alias.trim();
  if (!key) return;

  regionSearchMap[key] = code;
  regionSearchMap[key.toLowerCase()] = code;
}

for (const [code, sido] of Object.entries(REGION_HIERARCHY)) {
  addRegionAlias(sido.shortName, code);
  addRegionAlias(sido.name, code);
  addRegionAlias(sido.slug, code);

  for (const [sigunguCode, sigunguName] of Object.entries(sido.sigungu)) {
    addRegionAlias(sigunguName, sigunguCode);

    const shortName = sigunguName.replace(DISTRICT_SUFFIX_PATTERN, "");
    if (shortName.length >= 2) {
      addRegionAlias(shortName, sigunguCode);
    }
  }
}

export function searchRegionCode(keyword: string): string | null {
  const key = keyword.trim();
  if (!key) return null;

  return regionSearchMap[key] ?? regionSearchMap[key.toLowerCase()] ?? null;
}
