const APT_ID_SAFE_FALLBACK = "unknown";

export type ComplexIdentityInput = {
  regionCode: string;
  dongName?: string | null;
  aptName: string;
  builtYear?: number | string | null;
  propertyType?: number | null;
};

function compactWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function slugPart(value: string | null | undefined): string {
  const slug = compactWhitespace(value ?? "").normalize("NFKC")
    .replace(/[^가-힣a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return slug || APT_ID_SAFE_FALLBACK;
}

function identityBuiltYear(value: number | string | null | undefined): string {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? String(parsed) : APT_ID_SAFE_FALLBACK;
}

export function normalizeComplexName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[\s-]/g, "")
    .toLowerCase();
}

export function makeMolitIdentityId(govtComplexId: string): string {
  return `molit-${slugPart(govtComplexId)}`;
}

export function makeNaturalIdentityId(input: ComplexIdentityInput): string {
  return [
    "natural",
    slugPart(input.regionCode),
    slugPart(input.dongName),
    slugPart(input.aptName),
    identityBuiltYear(input.builtYear),
    input.propertyType ?? 1,
  ].join("-");
}

export function makeIdentityId(input: ComplexIdentityInput & {
  govtComplexId?: string | null;
}): string {
  return input.govtComplexId
    ? makeMolitIdentityId(input.govtComplexId)
    : makeNaturalIdentityId(input);
}

export function makeMolitCanonicalId(govtComplexId: string): string {
  return `molit:${govtComplexId}`;
}

export function makeNaturalCanonicalId(input: ComplexIdentityInput): string {
  return [
    "natural",
    input.regionCode,
    compactWhitespace(input.dongName ?? APT_ID_SAFE_FALLBACK),
    compactWhitespace(input.aptName),
    identityBuiltYear(input.builtYear),
    input.propertyType ?? 1,
  ].join(":");
}

export function makeIdentityCanonicalId(input: ComplexIdentityInput & {
  govtComplexId?: string | null;
}): string {
  return input.govtComplexId
    ? makeMolitCanonicalId(input.govtComplexId)
    : makeNaturalCanonicalId(input);
}
