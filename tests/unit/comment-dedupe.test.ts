import { beforeEach, describe, expect, it } from "vitest";
import {
  COMMENT_DEDUPE_WINDOW_MS,
  forgetCommentDedupe,
  resetCommentDedupeForTests,
  shouldCreateComment,
} from "@/lib/comment-dedupe";

const comment = {
  uid: "user-1",
  aptSlug: "11230-164",
  text: "좋은 정보 감사합니다.",
};

describe("comment dedupe", () => {
  beforeEach(() => {
    resetCommentDedupeForTests();
  });

  it("suppresses immediate duplicate comments from the same user", () => {
    const now = Date.UTC(2026, 0, 1);

    expect(shouldCreateComment(comment, now)).toBe(true);
    expect(shouldCreateComment(comment, now + 1)).toBe(false);
    expect(shouldCreateComment({
      ...comment,
      text: "다른 의견입니다.",
    }, now + 2)).toBe(true);
    expect(shouldCreateComment(
      comment,
      now + COMMENT_DEDUPE_WINDOW_MS + 1
    )).toBe(true);
  });

  it("can release a reserved comment after a failed store", () => {
    const now = Date.UTC(2026, 0, 1);

    expect(shouldCreateComment(comment, now)).toBe(true);
    forgetCommentDedupe(comment);
    expect(shouldCreateComment(comment, now + 1)).toBe(true);
  });
});
