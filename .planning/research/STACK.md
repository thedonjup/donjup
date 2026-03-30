# Technology Stack — v1.3 New Capabilities

**Project:** 돈줍 (donjup.com)
**Researched:** 2026-03-30
**Scope:** New stack requirements only — Next.js 16 + React 19 + Tailwind v4 + CockroachDB + Firebase already validated

---

## 1. Image Storage for Cardnews

### Decision: Vercel Blob

**Recommendation:** `@vercel/blob@^2.3.2`

**Why not Cloudflare R2:**
- R2 requires a Cloudflare account, Worker setup, and separate CORS configuration for public image access. For cardnews (5 PNG images per weekday), this is architectural overhead with no cost benefit at this scale.
- R2's zero-egress advantage only matters at high traffic volume. Instagram Graph API fetches images exactly once per post; zero ongoing egress.
- Adds a second vendor (Cloudflare) to a stack already committed to Vercel.

**Why Vercel Blob:**
- SDK integrates in one function call from an existing Next.js Route Handler — no new infrastructure.
- Public blobs get a Vercel CDN URL that Instagram Graph API can fetch directly (required: the image URL must be publicly accessible).
- Already on the Vercel platform — no new credentials, no CORS setup.
- The existing `generate-cardnews` route already has `TODO: wire up an actual storage provider`. Vercel Blob closes this in ~10 lines.

**Cost analysis at cardnews scale:**

| Metric | Volume/month | Vercel Blob | Cloudflare R2 |
|--------|-------------|-------------|---------------|
| Storage | ~5 images × 22 weekdays × ~500KB = ~55MB | ~$0.001/mo | ~$0.001/mo |
| Upload ops (Advanced) | 110 puts | included in free tier | free tier |
| Reads (Instagram fetch once) | 110 reads | included | free tier |
| Egress | Instagram fetches only, ~55MB | ~$0.003/mo | $0 |
| **Total** | | **< $0.01/mo** | **$0/mo** |

Both options cost effectively zero at this scale. Vercel Blob wins on integration simplicity.

**Free tier (Hobby plan):** 500MB storage, 1GB transfer/month — cardnews fits entirely in free tier.

**Installation:**

```bash
npm install @vercel/blob
```

**Environment variable required:**
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```
Set in Vercel project settings. Auto-available in Vercel deployment environment.

**Integration point** (`src/app/api/cron/generate-cardnews/route.ts`):

```typescript
import { put } from '@vercel/blob';

// After generateCardNews() returns buffers:
const storageUrls: string[] = [];
for (let i = 0; i < buffers.length; i++) {
  const { url } = await put(
    `cardnews/${today}/${cardType}-${i}.png`,
    buffers[i],
    { access: 'public', contentType: 'image/png' }
  );
  storageUrls.push(url);
}
```

The returned `url` is a `https://[hash].public.blob.vercel-storage.com/...` URL that Instagram Graph API can fetch.

**CSP update required** — add `https://*.public.blob.vercel-storage.com` to `img-src` in `next.config.ts`.

**Confidence:** HIGH — verified against official Vercel Blob docs (version 2.3.2, published 2026-03-27) and pricing page.

---

## 2. URL Migration with 301 Redirects in Next.js 16

### Decision: `next.config.ts` redirects (permanent: true = HTTP 308)

**No new packages needed.** Built into Next.js.

**Key fact:** Next.js does not emit HTTP 301 — it emits 308 for `permanent: true`. Google treats 308 identically to 301 for SEO purposes (confirmed by Google's John Mueller). This is intentional Next.js behavior to preserve HTTP method on redirect.

**Pattern for aptSeq-based URL migration:**

Current URL structure (unknown — needs audit at phase start), target is `aptSeq`-based slugs. Two redirect patterns cover the likely cases:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Pattern 1: Hash/ID-based old URLs → new slug URLs
      // Example: /apt/12345 → /apt/[slug]-12345
      // Handled at runtime in middleware or catch-all, not static config
      // (static config can't do DB lookups)

      // Pattern 2: Static path renames
      {
        source: '/apartment/:path*',
        destination: '/apt/:path*',
        permanent: true,
      },
      // Pattern 3: Query-param to path segment (e.g. /apt?id=123 → /apt/123)
      {
        source: '/apt',
        has: [{ type: 'query', key: 'id', value: '(?<id>.+)' }],
        destination: '/apt/:id',
        permanent: true,
      },
    ];
  },
};
```

**For slug-based redirects requiring DB lookup** (old aptSeq → new slug), use middleware:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Match /apt/[pure-number] and redirect to slug form
  const legacyMatch = pathname.match(/^\/apt\/(\d+)$/);
  if (legacyMatch) {
    // Slug lookup requires DB — use a redirect to a resolver endpoint
    // or build a static map at build time
    const url = request.nextUrl.clone();
    url.pathname = `/apt/redirect/${legacyMatch[1]}`;
    return NextResponse.redirect(url, 308);
  }
}
export const config = { matcher: ['/apt/:path*'] };
```

**Sitemap generation** — built-in Next.js App Router `sitemap.ts` (already exists at `src/app/sitemap.ts`). Extend it with dynamic apt URLs.

**Redirect limit:** No hard limit documented in Next.js 16 for `next.config.ts` redirects. For bulk migrations (hundreds of old URLs), use middleware pattern rather than enumerating in config.

**Confidence:** HIGH — verified against Next.js 16.2.1 official docs (last updated 2026-03-25).

---

## 3. Tailwind v4 CSS Variable Integration for Dynamic Colors

### Decision: `@theme inline` + `:root` / `[data-theme="dark"]` dual-declaration pattern

**No new packages needed.** Already on Tailwind v4 (`@import "tailwindcss"` in `globals.css`). Project already has a working pattern — this section describes how to extend it correctly.

**Existing setup (confirmed from `globals.css`):**

The project already uses:
- `:root` / `[data-theme="dark"]` for semantic color variables (surface, border, text, semantic)
- `@theme inline` for brand color utilities

This is the **correct v4 pattern**. The problem is the 82 hardcoded color values that bypass this system.

**The two-layer pattern to enforce:**

**Layer 1 — Semantic tokens** (in `:root` / `[data-theme="dark"]`, NOT in `@theme`):
```css
:root {
  --color-surface-card: #ffffff;
  --color-text-primary: #0f172a;
}
[data-theme="dark"] {
  --color-surface-card: #141b2d;
  --color-text-primary: #f1f5f9;
}
```
These are NOT `@theme` variables — they're plain CSS variables that change at runtime based on the `data-theme` attribute. Do NOT put these in `@theme` — `@theme` variables are static at build time.

**Layer 2 — Tailwind utilities** (in `@theme inline`):
```css
@theme inline {
  --color-surface-card: var(--color-surface-card);
  /* Maps Tailwind utility bg-surface-card → CSS variable */
}
```
The `inline` keyword makes Tailwind emit `background-color: var(--color-surface-card)` rather than a resolved hex — this is what enables runtime dark mode switching.

**Migration pattern for hardcoded values:**

Replace `style={{ color: '#0f172a' }}` or `className="text-[#0f172a]"` with:
1. Identify the semantic role (primary text, surface, etc.)
2. Use the existing CSS variable: `className="text-[var(--color-text-primary)]"` or add a Tailwind mapping in `@theme inline`

**For Recharts dynamic colors** (charts need JS-accessible color values):

```typescript
// src/lib/theme-colors.ts
export function getThemeColor(varName: string): string {
  if (typeof window === 'undefined') return '#10b981'; // SSR fallback
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

// Usage in chart component:
const dropColor = getThemeColor('--color-semantic-drop');
```

**Dark mode toggle** — the project uses `[data-theme="dark"]` on the root element (confirmed from `globals.css`). This works with `ThemeProvider.tsx`. No change to the toggle mechanism needed.

**What NOT to do:**
- Do NOT put semantic tokens (surface, text, border) in `@theme` — they need runtime switching, `@theme` is compile-time only
- Do NOT use `@theme` without `inline` for variables that reference other variables — without `inline`, Tailwind resolves the value at build time
- Do NOT add `tailwind-merge` or `clsx` — already should be present; if not, check before adding

**Confidence:** HIGH — verified against Tailwind v4 official docs and existing `globals.css` in the project.

---

## New Dependencies Summary

| Package | Version | Purpose | Install |
|---------|---------|---------|---------|
| `@vercel/blob` | `^2.3.2` | Cardnews image storage | `npm install @vercel/blob` |

**Total new packages: 1**

No other packages needed for URL redirects (built into Next.js) or Tailwind CSS variables (already configured).

---

## What NOT to Add

| Rejected | Reason |
|----------|--------|
| `@aws-sdk/client-s3` | Overkill for 5 images/day; adds AWS vendor dependency |
| Cloudflare R2 SDK | Zero cost advantage at this scale; adds Cloudflare vendor |
| Supabase Storage | Third vendor for a feature that fits Vercel Blob free tier |
| `next-themes` | Project already has `ThemeProvider.tsx` with `[data-theme]` pattern |
| `tailwind-merge` (`twMerge`) | Only needed if Tailwind class conflicts become a problem; evaluate at migration time |

---

## Sources

- [Vercel Blob Pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) — verified 2026-03-30
- [@vercel/blob on npm](https://www.npmjs.com/package/@vercel/blob) — v2.3.2 (2026-03-27)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) — verified 2026-03-30
- [Next.js 16 redirects API](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) — v16.2.1, updated 2026-03-25
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) — verified 2026-03-30
