import { createHash } from "node:crypto";

export interface RentTransactionIdentity {
  regionCode: string;
  dongName: string;
  aptName: string;
  sizeSqm: number;
  floor: number;
  deposit: number;
  monthlyRent: number;
  rentType: string;
  contractType: string;
  tradeDate: string;
  preDeposit: number | null;
  preMonthlyRent: number | null;
}

export function rentTransactionId(input: RentTransactionIdentity): string {
  const signature = JSON.stringify([
    input.regionCode,
    input.dongName,
    input.aptName,
    input.sizeSqm,
    input.floor,
    input.deposit,
    input.monthlyRent,
    input.rentType,
    input.contractType,
    input.tradeDate,
    input.preDeposit,
    input.preMonthlyRent,
  ]);

  return `rent:${createHash("sha256").update(signature).digest("hex")}`;
}
