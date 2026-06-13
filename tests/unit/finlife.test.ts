import { afterEach, describe, expect, it, vi } from "vitest";
import { bankNameToRateType, fetchMortgageLoanProducts } from "@/lib/api/finlife";

describe("FinLife API wrapper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FINLIFE_API_KEY;
  });

  it("falls back to base product metadata when option rows omit bank and product names", async () => {
    process.env.FINLIFE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          err_cd: "000",
          err_msg: "정상",
          total_count: 1,
          max_page_no: 1,
          now_page_no: 1,
          baseList: [
            {
              fin_prdt_cd: "P001",
              kor_co_nm: "국민은행",
              fin_prdt_nm: "KB 주담대",
            },
          ],
          optionList: [
            {
              fin_prdt_cd: "P001",
              lend_rate_type_nm: "고정",
              lend_rate_min: 3.5,
              lend_rate_max: 4.2,
              lend_rate_avg: null,
            },
          ],
        },
      }),
    }));

    await expect(fetchMortgageLoanProducts()).resolves.toEqual([
      {
        bankName: "국민은행",
        productName: "KB 주담대",
        rateType: "고정",
        rateMin: 3.5,
        rateMax: 4.2,
        rateAvg: null,
      },
    ]);
  });

  it("handles blank bank names without throwing", () => {
    expect(bankNameToRateType("")).toBe("BANK_UNKNOWN");
    expect(bankNameToRateType(" 국민은행 ")).toBe("BANK_KB");
  });
});
