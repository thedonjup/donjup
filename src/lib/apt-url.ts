/** URL용 슬러그 생성: regionCode-aptName (특수문자 제거) */
export function makeSlug(regionCode: string, aptName: string): string {
  return `${regionCode}-${aptName
    .replace(/[^가-힣a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()}`;
}
