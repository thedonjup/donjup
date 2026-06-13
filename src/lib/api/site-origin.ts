const ALLOWED_SITE_ORIGINS = [
  "https://donjup.com",
  "https://www.donjup.com",
] as const;

function configuredSiteOrigins(): string[] {
  const values = [
    process.env.NEXT_PUBLIC_SITE_URL ?? null,
    process.env.DONJUP_APP_ORIGIN ?? null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ];

  return values.flatMap((value) => {
    const origin = originFromUrl(value);
    return origin ? [origin] : [];
  });
}

function isAllowedLoopbackOrigin(origin: string | null): boolean {
  if (!origin) return false;

  try {
    const { hostname, protocol } = new URL(origin);
    return (
      (protocol === "http:" || protocol === "https:") &&
      (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1"
      )
    );
  } catch {
    return false;
  }
}

function isAllowedProductionOrigin(origin: string | null): boolean {
  if (origin === null) return false;

  return ALLOWED_SITE_ORIGINS.includes(origin as (typeof ALLOWED_SITE_ORIGINS)[number]) ||
    configuredSiteOrigins().includes(origin) ||
    isAllowedLoopbackOrigin(origin);
}

function originFromUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isAllowedSiteOrigin(
  origin: string | null,
  nodeEnv = process.env.NODE_ENV
): boolean {
  if (nodeEnv !== "production") {
    return true;
  }

  return isAllowedProductionOrigin(origin);
}

export function isAllowedSiteRequest(
  headers: Headers,
  nodeEnv = process.env.NODE_ENV
): boolean {
  if (nodeEnv !== "production") {
    return true;
  }

  const origin = headers.get("origin");
  if (origin !== null) {
    return isAllowedProductionOrigin(origin);
  }

  return isAllowedProductionOrigin(originFromUrl(headers.get("referer")));
}
