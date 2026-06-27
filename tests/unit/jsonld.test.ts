import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import {
  DatasetJsonLd,
  FinancialProductJsonLd,
  serializeJsonLd,
  type JsonLdData,
} from "@/components/seo/JsonLd";

function componentData(element: ReactElement<{ data: JsonLdData }>): JsonLdData {
  return element.props.data;
}

describe("JSON-LD helpers", () => {
  it("serializes structured data without raw less-than characters", () => {
    const serialized = serializeJsonLd({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "돈줍 <시장 데이터>",
    });

    expect(serialized).toContain("\\u003c시장 데이터>");
    expect(serialized).not.toContain("<시장 데이터>");
    expect(JSON.parse(serialized)).toEqual({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "돈줍 <시장 데이터>",
    });
  });

  it("builds FinancialProduct structured data for the rate page", () => {
    const data = componentData(FinancialProductJsonLd({
      name: "돈줍 주택담보대출 금리 비교",
      description: "은행별 주택담보대출 금리를 비교합니다.",
      url: "https://donjup.com/rate",
      annualPercentageRate: 3.42,
    }));

    expect(data["@type"]).toBe("FinancialProduct");
    expect(data.url).toBe("https://donjup.com/rate");
    expect(data.provider).toEqual({
      "@type": "Organization",
      name: "돈줍",
      url: "https://donjup.com",
    });
    expect(data.interestRate).toEqual({
      "@type": "QuantitativeValue",
      value: 3.42,
      unitText: "PERCENT",
    });
  });

  it("builds Dataset structured data for market and rent pages", () => {
    const data = componentData(DatasetJsonLd({
      name: "돈줍 전국 아파트 전월세 실거래 데이터셋",
      description: "국토교통부 전월세 실거래가 기반 공개 데이터셋입니다.",
      url: "https://donjup.com/rent",
      keywords: ["아파트 전세", "아파트 월세"],
      temporalCoverage: "2026-06",
    }));

    expect(data["@type"]).toBe("Dataset");
    expect(data.isAccessibleForFree).toBe(true);
    expect(data.url).toBe("https://donjup.com/rent");
    expect(data.keywords).toEqual(["아파트 전세", "아파트 월세"]);
    expect(data.temporalCoverage).toBe("2026-06");
  });
});
