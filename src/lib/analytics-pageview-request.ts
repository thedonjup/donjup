import { normalizePublicQuery } from "@/lib/public-query";

const MAX_PAGE_PATH_LENGTH = 300;
const MAX_PAGE_TYPE_LENGTH = 64;
const PAGE_PATH_PATTERN = /^\/[A-Za-z0-9가-힣._~!$&'()*+,;=:@%/-]*$/u;
const PAGE_TYPE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

export type ParsedPageviewRequest =
  | { ok: true; pagePath: string; pageType: string }
  | { ok: false; error: string };

function normalizePagePath(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const path = normalizePublicQuery(value).split(/[?#]/, 1)[0];
  if (
    !path ||
    path.length > MAX_PAGE_PATH_LENGTH ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    !PAGE_PATH_PATTERN.test(path)
  ) {
    return null;
  }

  return path;
}

function normalizePageType(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const pageType = value.trim().slice(0, MAX_PAGE_TYPE_LENGTH);
  return PAGE_TYPE_PATTERN.test(pageType) ? pageType : null;
}

export function inferPageType(pagePath: string): string {
  if (pagePath === "/") return "home";
  if (pagePath.startsWith("/apt/")) return "apt_detail";
  if (pagePath.startsWith("/daily/")) return "daily";
  if (pagePath.startsWith("/market")) return "market";
  if (pagePath.startsWith("/rate")) return "rate";
  if (pagePath.startsWith("/themes")) return "themes";
  if (pagePath.startsWith("/trend")) return "trend";
  if (pagePath.startsWith("/search")) return "search";
  if (pagePath.startsWith("/map")) return "map";
  if (pagePath.startsWith("/rent")) return "rent";
  if (pagePath.startsWith("/new-highs")) return "new_highs";
  if (pagePath.startsWith("/compare")) return "compare";

  return "other";
}

export function parsePageviewRequest(body: unknown): ParsedPageviewRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "pagePath는 필수입니다." };
  }

  const record = body as Record<string, unknown>;
  const pagePath = normalizePagePath(record.pagePath);
  if (!pagePath) {
    return { ok: false, error: "Invalid pagePath" };
  }

  return {
    ok: true,
    pagePath,
    pageType: normalizePageType(record.pageType) ?? inferPageType(pagePath),
  };
}
