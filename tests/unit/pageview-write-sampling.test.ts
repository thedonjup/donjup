import { describe, expect, it } from "vitest";
import {
  pageviewWriteWeight,
  parsePageviewWriteSampleRate,
  shouldSamplePageviewWrite,
} from "@/lib/pageview-write-sampling";

describe("pageview write sampling", () => {
  it("defaults invalid sample rates to full writes and clamps numeric values", () => {
    expect(parsePageviewWriteSampleRate(undefined)).toBe(1);
    expect(parsePageviewWriteSampleRate("")).toBe(1);
    expect(parsePageviewWriteSampleRate("   ")).toBe(1);
    expect(parsePageviewWriteSampleRate("abc")).toBe(1);
    expect(parsePageviewWriteSampleRate("-1")).toBe(0);
    expect(parsePageviewWriteSampleRate("0.25")).toBe(0.25);
    expect(parsePageviewWriteSampleRate("2")).toBe(1);
  });

  it("can disable or force pageview writes", () => {
    const input = {
      clientFingerprint: "203.0.113.1|agent",
      pagePath: "/apt/123",
    };

    expect(shouldSamplePageviewWrite({ ...input, sampleRate: 0 })).toBe(false);
    expect(shouldSamplePageviewWrite({ ...input, sampleRate: 1 })).toBe(true);
  });

  it("uses deterministic sampling for partial rates", () => {
    const input = {
      clientFingerprint: "203.0.113.2|agent",
      pagePath: "/search",
      sampleRate: 0.5,
    };

    expect(shouldSamplePageviewWrite(input)).toBe(shouldSamplePageviewWrite(input));
  });

  it("returns an approximate counter weight for sampled writes", () => {
    expect(pageviewWriteWeight(0)).toBe(0);
    expect(pageviewWriteWeight(1)).toBe(1);
    expect(pageviewWriteWeight(0.5)).toBe(2);
    expect(pageviewWriteWeight(0.1)).toBe(10);
  });
});
