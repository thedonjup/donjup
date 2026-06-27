import { describe, expect, it } from "vitest";
import {
  createAptOgImageResponse,
  safeAptOgText,
} from "@/lib/apt-og-image";

describe("apt OG image helpers", () => {
  it("normalizes unsafe text before rendering", () => {
    expect(safeAptOgText("  신나리\u00002차   ", "아파트", 20)).toBe("신나리 2차");
    expect(safeAptOgText("", "아파트", 20)).toBe("아파트");
    expect(safeAptOgText("가나다라마", "아파트", 3)).toBe("가나다");
  });

  it("creates a response even when dynamic metrics are unavailable", () => {
    const response = createAptOgImageResponse({
      aptName: "신나리2차",
      regionName: "경북 구미시 옥계동",
      price: null,
      rate: Number.NaN,
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });
});
