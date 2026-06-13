import { parseBoundedPositiveInt, type PageParam } from "@/lib/pagination";

export type AptExtremeType = "drop" | "high";

export function parseAptExtremeType(value: PageParam): AptExtremeType | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const type = raw?.trim() || "drop";

  if (type === "drop" || type === "high") {
    return type;
  }

  return null;
}

export function parseAptExtremesLimit(value: PageParam): number {
  return parseBoundedPositiveInt(value, {
    defaultValue: 10,
    max: 50,
  });
}
