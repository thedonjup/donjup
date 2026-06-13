import { getSigunguName } from "@/lib/constants/region-codes";

const REGION_CODE_PATTERN = /^\d{5}$/;

export function parseSigunguRegionCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed || !REGION_CODE_PATTERN.test(trimmed)) {
    return null;
  }

  return getSigunguName(trimmed) ? trimmed : null;
}
