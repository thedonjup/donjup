/**
 * DB slug에서 URL용 짧은 slug 추출
 * DB slug: "11230-164" (govtComplexId) 또는 "서해그랑블5단지" (한글 fallback)
 * URL slug: "164" (regionCode 제거) 또는 "서해그랑블5단지" (그대로)
 */
export function toUrlSlug(regionCode: string, dbSlug: string): string {
  const prefix = `${regionCode}-`;
  if (dbSlug.startsWith(prefix)) {
    return dbSlug.slice(prefix.length);
  }
  return dbSlug;
}

/** URL slug에서 DB slug 복원: region + urlSlug → DB slug */
export function toDbSlug(regionCode: string, urlSlug: string): string {
  // 숫자면 govtComplexId 형태 → regionCode-aptSeq
  if (/^\d+$/.test(urlSlug)) {
    return `${regionCode}-${urlSlug}`;
  }
  // 한글이면 그대로 (한글 slug)
  return urlSlug;
}

/** Fallback slug 생성: aptName으로 (govtComplexId 없는 단지용) */
export function makeSlug(regionCode: string, aptName: string): string {
  return aptName
    .replace(/[^가-힣a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/** Central URL builder for apartment detail pages (per D-08) */
export function aptUrl(complex: {
  govtComplexId: string | null;
  regionCode?: string;
  slug?: string;
}): string {
  if (complex.govtComplexId) {
    return `/apt/${complex.govtComplexId}`;
  }
  // Fallback for pre-backfill complexes
  if (complex.regionCode && complex.slug) {
    return `/apt/${complex.regionCode}/${toUrlSlug(complex.regionCode, complex.slug)}`;
  }
  return '/';
}
