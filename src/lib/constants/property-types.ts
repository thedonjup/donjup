/**
 * 부동산 유형 상수
 * 1=아파트, 2=연립다세대, 3=오피스텔, 4=토지, 5=상업업무용
 */

export const PROPERTY_TYPES = {
  APT: 1,
  VILLA: 2,
  OFFICETEL: 3,
  LAND: 4,
  COMMERCIAL: 5,
} as const;

export type PropertyType = (typeof PROPERTY_TYPES)[keyof typeof PROPERTY_TYPES];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PROPERTY_TYPES.APT]: "아파트",
  [PROPERTY_TYPES.VILLA]: "연립다세대",
  [PROPERTY_TYPES.OFFICETEL]: "오피스텔",
  [PROPERTY_TYPES.LAND]: "토지",
  [PROPERTY_TYPES.COMMERCIAL]: "상업업무용",
};
