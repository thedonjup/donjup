export const RATE_TYPES = {
  BASE_RATE: "기준금리",
  COFIX_NEW: "신규취급액 COFIX",
  COFIX_BAL: "잔액기준 COFIX",
  CD_91: "CD 91일물",
  TREASURY_3Y: "국고채 3년",
} as const;

export type RateType = keyof typeof RATE_TYPES;
