import { describe, expect, it } from "vitest";
import { parseCommentCreateRequest } from "@/lib/comment-request";

describe("comment request", () => {
  it("parses valid comment create requests", () => {
    expect(
      parseCommentCreateRequest({
        aptSlug: "11230-164",
        text: "  좋은 정보 감사합니다.\r\n다시 볼게요.  ",
      })
    ).toEqual({
      ok: true,
      aptSlug: "11230-164",
      text: "좋은 정보 감사합니다.\n다시 볼게요.",
    });
  });

  it("rejects malformed apartment references", () => {
    expect(parseCommentCreateRequest({ aptSlug: "a/b", text: "hello" }).ok).toBe(false);
    expect(parseCommentCreateRequest({ aptSlug: " apt ", text: "hello" }).ok).toBe(false);
    expect(parseCommentCreateRequest({ aptSlug: "..", text: "hello" }).ok).toBe(false);
  });

  it("rejects empty, overlong, or control-character comments", () => {
    expect(parseCommentCreateRequest({ aptSlug: "apt", text: "   " }).ok).toBe(false);
    expect(parseCommentCreateRequest({ aptSlug: "apt", text: "a".repeat(201) }).ok).toBe(false);
    expect(parseCommentCreateRequest({ aptSlug: "apt", text: "hello\u0000" }).ok).toBe(false);
  });
});
