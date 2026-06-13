const MAX_DEBUG_APT_SLUG_LENGTH = 160;

type ParsedDebugAptQuery = {
  ok: true;
  slug: string;
};

type InvalidDebugAptQuery = {
  ok: false;
  error: string;
};

export function parseDebugAptQuery(
  searchParams: URLSearchParams
): ParsedDebugAptQuery | InvalidDebugAptQuery {
  const values = searchParams.getAll("slug");
  if (values.length === 0) {
    return { ok: false, error: "Missing slug parameter" };
  }

  if (values.length > 1) {
    return { ok: false, error: "Duplicate slug parameter" };
  }

  const slug = values[0]?.trim() ?? "";
  if (!slug) {
    return { ok: false, error: "Missing slug parameter" };
  }

  if (slug.length > MAX_DEBUG_APT_SLUG_LENGTH) {
    return { ok: false, error: "Slug parameter is too long" };
  }

  return { ok: true, slug };
}
