import { describe, expect, it } from "vitest";
import { normalizePublicQuery, parseBoundedTextQuery } from "@/lib/public-query";

describe("public query helpers", () => {
  it("normalizes whitespace and strips control characters", () => {
    expect(normalizePublicQuery("  서울\t강남구\n대치동\u0000 ")).toBe("서울 강남구 대치동");
  });

  it("accepts text inside length bounds", () => {
    expect(parseBoundedTextQuery("  서울 강남구  ", {
      minLength: 2,
      maxLength: 20,
    })).toBe("서울 강남구");
  });

  it("rejects empty, short, and overlong text", () => {
    expect(parseBoundedTextQuery("", { minLength: 2, maxLength: 10 })).toBeNull();
    expect(parseBoundedTextQuery("서", { minLength: 2, maxLength: 10 })).toBeNull();
    expect(parseBoundedTextQuery("서울".repeat(20), {
      minLength: 2,
      maxLength: 10,
    })).toBeNull();
  });
});
