import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/components/seo/JsonLd";

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
});
