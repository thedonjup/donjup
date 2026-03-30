# Architecture: v1.3 Integration Points

**Project:** 돈줍 (donjup.com)
**Researched:** 2026-03-30
**Milestone:** v1.3 서비스 품질 개선

---

## 1. CSS Variable System — Dynamic Colors with Dark Mode

### Current State (the problem)

Three conflicting styling layers coexist:

| Layer | Examples | Dark Mode? |
|-------|----------|------------|
| CSS vars in globals.css | `var(--color-semantic-drop)` | YES — `[data-theme="dark"]` block |
| Tailwind `@theme inline` tokens | `text-brand-500`, `bg-drop` | NO — static values |
| Inline `style={}` with hardcoded hex | `stroke="#9CA3AF"`, `fill="#059669"` | NO |

ThemeProvider writes `data-theme="dark"` to `document.documentElement`. CSS vars in `:root` / `[data-theme="dark"]` respond correctly. Tailwind utility classes compiled from `@theme inline` do not respond — they are static at build time.

Charts are the worst offenders: Recharts `stroke`, `fill`, and tooltip inline styles use hardcoded hex values that never change in dark mode.

### Integration Pattern

**New CSS vars needed** (add to globals.css `:root` + `[data-theme="dark"]`):

```css
/* Chart-specific semantic tokens */
--color-chart-sale: #059669;       /* dark: #34d399 */
--color-chart-rent: #3B82F6;       /* dark: #60A5FA */
--color-chart-jeonse-rate: #F97316; /* dark: #FB923C */
--color-chart-grid: #9CA3AF;       /* dark: #4B5563 */
--color-chart-axis: #9CA3AF;       /* dark: #4B5563 */
--color-chart-tooltip-bg: #ffffff; /* dark: #1e293b */
--color-chart-tooltip-border: #e2e8f0; /* dark: #334155 */

/* Index chart */
--color-chart-index-line: #2B579A; /* dark: #60A5FA */
```

**Usage pattern for Recharts props** — Recharts SVG props accept CSS var strings in JSX:

```tsx
// BEFORE (breaks dark mode)
<Line stroke="#059669" />

// AFTER (dark-mode safe)
<Line stroke="var(--color-chart-sale)" />
```

Recharts renders to SVG. SVG attribute values resolve CSS vars at paint time, so `var(--color-*)` in `stroke`/`fill` props works correctly across theme switches.

**Tailwind token cleanup** — The `@theme inline` block provides static Tailwind classes. Keep for layout/typography. For any color that must change with theme, migrate to `style={{ color: "var(--color-*)" }}` or a wrapper utility class defined in globals.css.

### New Files / Modified Files

| Action | File | Change |
|--------|------|--------|
| MODIFY | `src/app/globals.css` | Add chart-specific CSS vars to `:root` and `[data-theme="dark"]` |
| MODIFY | `src/components/charts/PriceHistoryChart.tsx` | Replace 8 hardcoded hex values with CSS var strings |
| MODIFY | `src/components/charts/ClusterIndexChart.tsx` | Replace `#2B579A`, `#9CA3AF` |
| MODIFY | `src/components/map/FilterChip.tsx` | Replace `#fff` inline |
| MODIFY | `src/components/onboarding/RegionSelector.tsx` | Replace hardcoded brand hex with CSS var |

### Build Constraint

Recharts is a client component. The chart components must remain `"use client"`. No server-side CSS var resolution occurs — this is correct because `data-theme` is set client-side via ThemeProvider.

---

## 2. URL Migration — Name-Based to ID-Based with Next.js Middleware

### Current URL Structure

```
/apt/[region]/[slug]
```

Where `region` = `region_code` (e.g., `11680`) and `slug` = `{region_code}-{encoded-apt-name}` (e.g., `11680-래미안퍼스티지`).

**Problem:** Korean apartment names change (rebrands, corrections). The slug field in `apt_complexes` exists and is unique, but the lookup logic is fragile — page has two fallback paths (exact slug match → parse region_code from slug → brute-force scan) totaling 3 DB queries per page load.

### Target URL Structure

```
/apt/[id]          ← aptSeq / govtComplexId based
```

`govtComplexId` is already in schema as `apt_complexes.govt_complex_id` (format: `{region_code}-{aptSeq}`, populated by cron). The `aptComplexes.id` UUID is also available. Either works; `govtComplexId` is more human-readable for SEO.

### Migration Architecture

**No new route file needed.** Use Next.js middleware to intercept old URL pattern and redirect.

```
src/middleware.ts   ← NEW FILE
```

```ts
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Match /apt/{region}/{slug} — old 2-segment pattern
  const match = pathname.match(/^\/apt\/(\d+)\/(.+)$/);
  if (match) {
    const [, region, slug] = match;
    // Redirect to lookup endpoint that resolves slug → govtComplexId
    // Simplest: redirect to /apt/{region}-{slug} then the new page resolves
    const newPath = `/apt/${region}-${slug}`;
    return NextResponse.redirect(new URL(newPath, request.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/apt/:region/:slug*"],
};
```

**However**, a middleware-only redirect without a DB lookup means the new URL must still encode enough info to find the apartment. The cleanest approach:

**Option A (recommended): govtComplexId as canonical URL**
- New URL: `/apt/[govtComplexId]` e.g. `/apt/11680-12345`
- Old URL: `/apt/11680/래미안퍼스티지` → middleware redirect
- Middleware cannot do DB lookup (edge runtime) → redirect to `/apt/search?slug={old-slug}&region={region}` → server component resolves → issues 301 to canonical

**Option B (simpler): keep route structure, change lookup**
- Keep `/apt/[region]/[slug]` route
- Add `/apt/[id]` as new parallel route accepting `govtComplexId`
- Middleware redirects old slug patterns to new ID-based URL after one DB resolution

**Recommended: Option B for safety**

```
src/app/apt/[id]/page.tsx     ← NEW route (accepts govtComplexId or UUID)
src/app/apt/[region]/[slug]/  ← KEEP, add redirect in generateMetadata
src/middleware.ts              ← NEW, edge-compatible slug→id lookup via API
```

The existing `src/app/api/apt/[id]/route.ts` already handles UUID and slug lookup. Extend it to also accept `govtComplexId`.

### Sitemap Integration

`src/app/apt/sitemap.ts` exists. After URL migration, update to generate `/apt/{govtComplexId}` URLs. Ensure old URLs are not included — Google picks up 301 redirects but old URLs should be excluded from the new sitemap.

### makeSlug Centralization

Current: 4 files each define `makeSlug(regionCode, aptName)` identically.

```
NEW: src/lib/apt-slug.ts
```

```ts
export function makeSlug(regionCode: string, aptName: string): string {
  return `${regionCode}-${aptName}`;
}

export function aptUrl(govtComplexId: string): string {
  return `/apt/${govtComplexId}`;
}
```

Replace 4 local definitions with import. After URL migration, all link generation switches to `aptUrl(govtComplexId)`.

**Files to update:**
- `src/app/new-highs/page.tsx` — remove local makeSlug, import
- `src/app/themes/[slug]/page.tsx` — remove local makeSlug, import
- `src/app/today/page.tsx` — remove local makeSlug, import
- `src/components/home/RankingTabs.tsx` — remove local makeSlug, import

---

## 3. Vercel Blob Integration — Cardnews Storage

### Current State (broken)

`generateCardNews()` returns `Buffer[]` (5 PNG buffers). The `instagramPosts` schema has `imageUrls text[]` but nothing writes to it — the Blob upload step is missing. `publishCarousel()` requires publicly accessible URLs; Buffer objects cannot be passed to Instagram Graph API.

### Integration Architecture

**Missing layer: Buffer → Blob URL**

```
NEW: src/lib/cardnews/storage.ts
```

```ts
import { put } from "@vercel/blob";

export async function uploadCardNewsBuffers(
  buffers: Buffer[],
  reportDate: string,
  cardType: string
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const filename = `cardnews/${reportDate}/${cardType}-${i}.png`;
    const { url } = await put(filename, buffers[i], {
      access: "public",
      contentType: "image/png",
    });
    urls.push(url);
  }
  return urls;
}
```

**Updated pipeline** in `src/lib/cardnews/generator.ts`:

```
generateDailyCardNews()
  → generateCardNews() → Buffer[]
  → uploadCardNewsBuffers() → string[]   ← NEW
  → publishCarousel(imageUrls, caption)  ← already works
  → db.insert(instagramPosts, { imageUrls, mediaId, ... })
```

**New dependency:**
```bash
npm install @vercel/blob
```

**Environment variable required:** `BLOB_READ_WRITE_TOKEN` (set in Vercel project settings).

### API Endpoint

A cron-triggered endpoint should orchestrate the full pipeline:

```
src/app/api/cron/publish-cardnews/route.ts   ← NEW
```

This calls `generateDailyCardNews()`, uploads via `uploadCardNewsBuffers()`, calls `publishCarousel()`, then inserts to `instagram_posts`. The existing `content_queue` schema may be used for scheduling; check `src/lib/db/schema/content-queue.ts`.

### Vercel Blob URL Characteristics

- URLs are permanent and publicly accessible (required for Instagram Graph API)
- Format: `https://{store-id}.public.blob.vercel-storage.com/{path}`
- No expiry for `access: "public"` blobs
- Instagram Graph API polls the URL server-side; Vercel Blob CDN must respond with `Content-Type: image/png` and appropriate CORS headers — Vercel Blob does this by default

---

## 4. Centralized Formatting Utilities

### Current State

| Utility | Defined in lib/format.ts | Duplicated in |
|---------|-------------------------|---------------|
| `formatPrice(manWon)` | YES | `PriceHistoryChart.tsx` (local copy), `ClusterIndexChart.tsx` (local copy) |
| `sqmToPyeong(sqm)` | YES | `AptDetailClient.tsx` (local copy), `TransactionTabs.tsx` (local inline) |
| `formatKrw(won)` | YES | `MiniLoanCalculator.tsx` (local copy) |
| `formatDate` | NOT in lib/format.ts | `AptDetailClient.tsx` (inline slice) |
| `formatPriceShort` | NOT in lib/format.ts | `AptDetailClient.tsx` (local), `ClusterIndexChart.tsx` (local) |
| null display (`"-"`) | NOT standardized | Ad hoc throughout |

### Target State

**Extend `src/lib/format.ts`:**

```ts
// Add these:
export function formatPriceShort(manWon: number): string { ... }
export function formatDateKr(dateStr: string): string { ... }  // "2024-03-15" → "24.03.15"
export function formatNullable(value: unknown, fallback = "-"): string { ... }
export function formatArea(sqm: number, showBoth = true): string { ... }
```

**Remove local copies from:**
- `src/components/charts/PriceHistoryChart.tsx` — local `formatPrice`, `formatYAxis`
- `src/components/charts/ClusterIndexChart.tsx` — local `formatPrice`
- `src/components/apt/AptDetailClient.tsx` — local `sqmToPyeong`, `formatPriceShort`
- `src/components/apt/MiniLoanCalculator.tsx` — local `formatKrw`
- `src/components/apt/TransactionTabs.tsx` — local `sqmToPyeong` inline

---

## 5. Build Order (Phase Dependencies)

```
Phase A: Formatting utilities centralization
  → No dependencies. Pure refactor. Safe to do first.
  → Unblocks: all other phases (removes duplicate code before touching files)

Phase B: CSS variable system
  → Depends on: Phase A complete (cleaner files to edit)
  → Must complete before: any visual QA

Phase C: makeSlug centralization
  → No dependencies. Pure refactor.
  → Must complete before: URL migration (Phase D)

Phase D: URL migration (new /apt/[id] route + middleware)
  → Depends on: Phase C (makeSlug centralized, aptUrl helper ready)
  → Risk: High. Requires careful 301 redirect testing.
  → Sitemap update is a sub-task of this phase.

Phase E: Vercel Blob + Instagram pipeline
  → Depends on: Blob token configured in Vercel env vars
  → No code dependency on A-D. Can parallelize with B/C.
```

**Recommended order:** A → C → B → D → E

Rationale: Format utilities and slug centralization are pure refactors with zero runtime risk. CSS variable system has cosmetic risk only. URL migration has SEO/404 risk and must be last in the core-features sequence. Blob/Instagram pipeline is independent and can be a separate phase.

---

## 6. Integration Points Summary

| Improvement | New Files | Modified Files | External Deps |
|-------------|-----------|----------------|---------------|
| CSS vars for charts | globals.css (additions) | PriceHistoryChart.tsx, ClusterIndexChart.tsx, FilterChip.tsx, RegionSelector.tsx | None |
| URL migration | middleware.ts, `/apt/[id]/page.tsx`, `lib/apt-slug.ts` | sitemap.ts, new-highs/page.tsx, today/page.tsx, themes/[slug]/page.tsx, RankingTabs.tsx | None |
| Vercel Blob | `lib/cardnews/storage.ts`, `api/cron/publish-cardnews/route.ts` | `lib/cardnews/generator.ts` | `@vercel/blob`, `BLOB_READ_WRITE_TOKEN` env |
| Formatting utils | None (extend existing) | format.ts, AptDetailClient.tsx, PriceHistoryChart.tsx, ClusterIndexChart.tsx, MiniLoanCalculator.tsx, TransactionTabs.tsx | None |

---

## 7. URL Migration Safety

**Risk:** Existing bookmarks, Google index, Kakao share links all use `/apt/{region}/{slug}`. Breaking these = permanent 404s and SEO damage.

**Required safety measures:**

1. **301 not 302** — permanent redirect signals Google to transfer PageRank
2. **Test middleware matching** — verify regex does not capture `/apt/[id]` new URLs (numeric-only `[id]` vs `{region}/{slug}` 2-segment)
3. **Fallback in new page** — `/apt/[id]/page.tsx` must handle `govtComplexId`, UUID, and plain slug (for transition period)
4. **Sitemap transition** — generate new sitemap with new URLs before removing old ones; Google processes sitemaps asynchronously
5. **Monitor 404s** — check Vercel logs for 2 weeks post-deploy

**govtComplexId coverage gap:** Not all `apt_complexes` rows have `govtComplexId` populated (cron only fills it on new transactions). Before URL migration, run a backfill migration to ensure full coverage. Without this, some apartments have no stable ID to redirect to.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| CSS var / Recharts SVG pattern | HIGH | Recharts passes props directly to SVG attributes; CSS vars in SVG attributes is standard browser behavior |
| Next.js middleware redirect syntax | HIGH | Project uses Next.js 16 App Router; middleware API is stable |
| Vercel Blob `put()` API | MEDIUM | Based on `@vercel/blob` v0.x docs; verify current SDK signature before implementation |
| govtComplexId coverage | MEDIUM | Cron populates it for new transactions; historical rows may be null — needs DB query to confirm coverage |
| Instagram Graph API + Blob URL | HIGH | Graph API requires publicly accessible URLs; Vercel Blob public access satisfies this |
