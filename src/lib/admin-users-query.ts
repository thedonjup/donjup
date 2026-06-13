import { parseBoundedPositiveInt } from "@/lib/pagination";

const MAX_PAGE_TOKEN_LENGTH = 1024;
const PAGE_TOKEN_UNSAFE_PATTERN = /[\u0000-\u001F\u007F\s]/;

export type AdminUsersQuery = {
  maxResults: number;
  pageToken: string | undefined;
};

export function parseAdminUsersPageToken(value: string | null | undefined): string | null | undefined {
  if (value == null || value === "") return undefined;

  const token = value.trim();
  if (
    !token ||
    token.length > MAX_PAGE_TOKEN_LENGTH ||
    PAGE_TOKEN_UNSAFE_PATTERN.test(token)
  ) {
    return null;
  }

  return token;
}

export function parseAdminUsersQuery(searchParams: URLSearchParams): AdminUsersQuery | null {
  const pageToken = parseAdminUsersPageToken(searchParams.get("pageToken"));
  if (pageToken === null) return null;

  return {
    maxResults: parseBoundedPositiveInt(searchParams.get("limit"), {
      defaultValue: 100,
      max: 1000,
    }),
    pageToken,
  };
}
