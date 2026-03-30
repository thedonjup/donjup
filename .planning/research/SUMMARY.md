# Project Research Summary

**Project:** 돈줍 (donjup.com)
**Domain:** Korean real estate data platform — v1.3 service quality improvement
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

돈줍 v1.3 is a service quality milestone, not a feature milestone. All four work streams (design system dark mode, price format normalization, URL restructure, Instagram cardnews pipeline) address existing infrastructure that is 70-90% implemented but blocked by small, specific gaps. The core stack (Next.js 16, Tailwind v4, Neon PostgreSQL, Vercel) requires only one new dependency: `@vercel/blob` for image storage. Everything else is already in place and just needs to be wired correctly.

The highest-leverage intervention in the entire milestone is a single CSS line: adding `@custom-variant dark` to `globals.css`, which unblocks all `dark:` Tailwind utilities that are currently silent. The second-highest leverage is a `@vercel/blob` storage integration (~30 lines of code) that unblocks the entire Instagram posting pipeline, which has been built but non-functional because generated images are never persisted. The URL migration is the highest-risk item and requires careful atomic deployment — redirects and new routes must ship in the same commit.

Key risks are all known and preventable: `@theme inline` silently breaks dark mode at runtime if misapplied; URL changes deployed without simultaneous 301 redirects cause SEO damage that takes weeks to recover; and the Vercel serverless 4.5 MB body limit will silently break image uploads if the server-upload pattern is used instead of client-side upload. All three risks have clear, documented mitigations.

---

## Key Findings

### Recommended Stack

The stack requires no architectural additions. One new package (`@vercel/blob@^2.3.2`) closes the cardnews storage gap. URL redirects are handled by built-in Next.js middleware. Tailwind v4's `@theme inline` + `:root`/`[data-theme="dark"]` dual-declaration pattern is already the correct pattern in `globals.css`; the problem is 82 hardcoded hex values that bypass this system.

**Core technologies:**
- `@vercel/blob@^2.3.2`: Cardnews image storage — single SDK call, Vercel CDN URL, satisfies Instagram Graph API's public HTTPS URL requirement
- Next.js middleware (`src/middleware.ts`): URL migration via 308 redirect — no extra package, edge-compatible
- Tailwind v4 `@custom-variant dark`: One-line CSS declaration that activates all `dark:` utilities — currently missing from `globals.css`

### Expected Features

**Must have (table stakes):**
- Consistent `억/만원` price format throughout — `formatPrice()` exists, inconsistently applied to charts and ranking tables
- Working dark mode end-to-end — partial: CSS vars respond but `dark:` Tailwind utilities are broken
- Null/empty data shown as `-` not `0` or blank — ad hoc throughout, needs standardization
- Stable apartment URLs (no 404 on bookmarks/shares) — current slug-only URLs are fragile

**Should have (competitive differentiators):**
- Daily Instagram cardnews auto-posting — no Korean competitor does this; pipeline 90% built, storage gap is the only blocker
- Complete Sitemap with all `aptSeq`-based URLs — long-tail SEO for 50K+ apartments
- Centralized `makeSlug()` / `aptUrl()` utility — prevents future slug drift across 4 caller sites

**Defer (v2+):**
- Chart legend improvements — cosmetic only
- Profile link fixes — minor
- Instagram Reels / video — high complexity, no data format benefit
- Full UI redesign — v3 milestone

### Architecture Approach

The architecture is a refactor and wire-up, not new construction. Five independent improvement streams can be executed in sequence (A→C→B→D→E) where A and C are pure refactors with zero runtime risk, B is cosmetic-risk only, D (URL migration) carries SEO risk and must be last in the core sequence, and E (Blob/Instagram) is fully independent and can run in parallel with B and C.

**Major components:**
1. `src/lib/format.ts` — extend with `formatPriceShort`, `formatDateKr`, `formatNullable`, `formatArea`; remove 5 local duplicates from chart/apt components
2. `src/lib/apt-slug.ts` (NEW) — centralize `makeSlug(regionCode, aptName)` and `aptUrl(govtComplexId)`; replace 4 scattered definitions
3. `src/app/globals.css` — add `@custom-variant dark` declaration + chart-specific CSS vars (`--color-chart-sale`, `--color-chart-rent`, etc.) with dark overrides
4. `src/lib/cardnews/storage.ts` (NEW) — `uploadCardNewsBuffers(buffers, date, type) → string[]` using `@vercel/blob`
5. `src/middleware.ts` (NEW) — edge-compatible URL migration: `/apt/[region]/[slug]` → `/apt/[govtComplexId]` with 308 redirect
6. `src/app/apt/[id]/page.tsx` (NEW) — new canonical route accepting `govtComplexId`

### Critical Pitfalls

1. **`@theme inline` breaks runtime dark mode** — Use plain `@theme` (without `inline`) for all theme-responsive color tokens; `inline` bakes values at build time. Detection: toggle dark mode in devtools — if computed colors don't change, `inline` is the cause.

2. **URL change deployed without simultaneous 301** — Redirects and new routes must be in the same commit, no exceptions. A 404 window of even a few hours on a production site causes Google to register pages as gone; recovery takes 4-8 weeks.

3. **Vercel serverless 4.5 MB body limit kills image uploads** — Cardnews images (1080x1080 PNG) exceed this. Use client-side upload pattern: server issues a token, browser uploads directly to Vercel Blob edge, serverless function never touches the bytes.

4. **`makeSlug` algorithm divergence on centralization** — New `makeSlug` must produce byte-identical output to existing implementations for all apartments in DB. Run both old and new against full apartment list; zero mismatches required before merge.

5. **`BLOB_READ_WRITE_TOKEN` missing in dev/preview** — Run `vercel env pull .env.local` immediately after creating blob store; verify token exists for Production, Preview, and Development scopes in `vercel env ls`.

---

## Implications for Roadmap

Based on the architecture's build order (A→C→B→D→E) and risk profile:

### Phase 1: Formatting Utilities Centralization
**Rationale:** Pure refactor, zero runtime risk, eliminates duplicates before other phases touch the same files.
**Delivers:** Single source of truth for all number/date formatting; standardized null display.
**Addresses:** Consistent price format (table stakes), null/empty display (table stakes).
**Avoids:** Price format inconsistency that would require double-touching components in later phases.
**Research flag:** Not needed — well-documented pattern.

### Phase 2: Slug Centralization
**Rationale:** Pure refactor, zero runtime risk, must complete before URL migration phase.
**Delivers:** `src/lib/apt-slug.ts` with `makeSlug` + `aptUrl`; 4 call sites updated.
**Addresses:** Centralized slug as developer ergonomic differentiator.
**Avoids:** Pitfall 8 (makeSlug algorithm divergence) — audit all implementations before centralizing.
**Research flag:** Not needed — straightforward consolidation.

### Phase 3: Design System / Dark Mode Fix
**Rationale:** One-line CSS fix + component sweep; cosmetic risk only; should complete before any visual QA.
**Delivers:** Working dark mode end-to-end; chart colors respect theme; no hardcoded hex in components.
**Addresses:** Functional dark mode (differentiator), consistent visual design.
**Avoids:** Pitfall 1 (`@theme inline`), Pitfall 5 (`[--var]` syntax), Pitfall 6 (border/ring defaults).
**Research flag:** Not needed — Tailwind v4 docs are authoritative and clear.

### Phase 4: URL Migration
**Rationale:** Highest-risk phase; must follow slug centralization; requires atomic deploy of redirects + new routes + sitemap.
**Delivers:** Canonical `/apt/[govtComplexId]` URLs; `src/middleware.ts` 308 redirects; updated sitemap; old URLs never 404.
**Addresses:** Stable apartment URLs (table stakes), aptSeq-canonical URLs + complete Sitemap (differentiator).
**Avoids:** Pitfall 2 (redirect missing on deploy), Pitfall 8 (slug mismatch), Pitfall 11 (sitemap not updated).
**Critical pre-condition:** Run `govtComplexId` backfill migration to ensure full coverage before deploy.
**Research flag:** Needs verification of `govtComplexId` coverage in DB before planning phase tasks.

### Phase 5: Vercel Blob + Instagram Pipeline
**Rationale:** Fully independent of phases 1-4; can parallelize with phase 3 and 4 in planning; unblocks the most visible differentiator.
**Delivers:** `src/lib/cardnews/storage.ts`; cardnews images persisted to Vercel Blob; `storageUrls` populated; `publishCarousel()` executes daily.
**Uses:** `@vercel/blob@^2.3.2`, `BLOB_READ_WRITE_TOKEN` env var.
**Addresses:** Daily cardnews auto-posting (differentiator).
**Avoids:** Pitfall 3 (token missing in dev), Pitfall 4 (4.5 MB serverless limit — use client-side upload), Pitfall 10 (wrong Blob region — choose AP).
**Research flag:** Verify current `@vercel/blob` SDK signature (`put()` and `handleUpload` API) at implementation time — architecture research notes v0.x docs were used as reference.

### Phase Ordering Rationale

- Phases 1 and 2 are pure refactors with no production surface — they de-risk all subsequent phases by eliminating duplicates before those files are touched.
- Phase 3 (dark mode) is cosmetic-risk only and must precede any visual QA of later phases.
- Phase 4 (URL) is last in the core sequence because it carries the highest production risk (SEO). Attempting it before slug centralization is complete would force touching more files under risk.
- Phase 5 (Instagram) is genuinely independent and can be planned or executed in parallel with phases 3-4 if capacity allows.

### Research Flags

Needs additional research during planning:
- **Phase 4 (URL Migration):** Query `SELECT COUNT(*) FROM apt_complexes WHERE govt_complex_id IS NULL` before planning. If significant nulls exist, the backfill migration becomes a blocking pre-task that affects phase duration.
- **Phase 5 (Blob):** Verify current `@vercel/blob` `put()` signature and client-upload API (`handleUpload`) against v2.3.2 changelog before writing storage module.

Phases with standard patterns (skip research):
- **Phase 1 (Format Utils):** Standard TypeScript utility extraction.
- **Phase 2 (Slug):** Simple consolidation; exact output parity test covers the risk.
- **Phase 3 (Design System):** Tailwind v4 docs are clear and authoritative.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new dep (`@vercel/blob`); all others verified against official docs |
| Features | HIGH | Codebase audit confirms current state; competitor patterns verified by direct URL observation |
| Architecture | HIGH | Build order derived from actual code dependencies; CSS var / Recharts SVG pattern is standard browser behavior |
| Pitfalls | HIGH | Tailwind and Vercel pitfalls sourced from official docs and real-world issue reports; SEO redirect rules from Google's own documentation |

**Overall confidence:** HIGH

### Gaps to Address

- **`govtComplexId` DB coverage:** Architecture research flags that `govtComplexId` may be null for historical rows (cron only fills on new transactions). Run coverage query before scoping Phase 4. If >5% null, add a backfill migration task to Phase 4.
- **Vercel Blob SDK version:** Architecture research used v0.x API docs as reference. Confirm `put()` signature and `handleUpload` client API match v2.3.2 before implementing Phase 5 storage module.
- **CSP update:** Adding Vercel Blob requires `https://*.public.blob.vercel-storage.com` in `img-src` of `next.config.ts`. Small but easy to miss — add to Phase 5 task list.

---

## Sources

### Primary (HIGH confidence)
- [Vercel Blob Pricing & Docs](https://vercel.com/docs/vercel-blob) — storage integration, free tier, client upload pattern
- [@vercel/blob v2.3.2 on npm](https://www.npmjs.com/package/@vercel/blob) — SDK version, published 2026-03-27
- [Next.js 16 redirects API](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) — v16.2.1, updated 2026-03-25
- [Tailwind CSS v4 Theme Variables](https://tailwindcss.com/docs/theme) — `@theme inline` behavior
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) — `@custom-variant dark` requirement
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) — syntax changes, default changes
- [Instagram Graph API — Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/) — URL requirements, rate limits
- [Google: Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects) — 301/308 SEO equivalence
- [Vercel: How to bypass 4.5MB body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — client-side upload pattern
- Donjup codebase audit (`globals.css`, `format.ts`, `cardnews/render.ts`, `instagram/client.ts`, `apt_complexes` schema) — direct inspection

### Secondary (MEDIUM confidence)
- [호갱노노 URL pattern](https://hogangnono.com/apt/e1u54) — competitor URL structure observation
- [아실 URL pattern](https://asil.kr) — competitor URL structure
- [부동산지인 price format](https://aptgin.com) — Korean price display conventions
- [Tailwind v4 @theme inline discussion](https://github.com/tailwindlabs/tailwindcss/discussions/18560) — community confirmation of build-time resolution behavior
- [Vercel: No token found discussion](https://github.com/vercel/community/discussions/5159) — dev environment token gap confirmation

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
