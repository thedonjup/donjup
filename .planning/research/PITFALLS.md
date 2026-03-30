# Domain Pitfalls: v1.3 서비스 품질 개선

**Domain:** Production real estate app — design system, URL restructure, blob storage, data normalization
**Researched:** 2026-03-30
**Scope:** Mistakes specific to ADDING these changes to an existing production system

---

## Critical Pitfalls

Mistakes that cause rewrites, SEO ranking loss, or production outages.

---

### Pitfall 1: @theme inline Breaks Dark Mode at Runtime

**What goes wrong:** Using `@theme inline` to define color tokens looks correct and compiles fine, but dark mode stops working. Switching `.dark` class or `data-mode="dark"` has no effect on component colors.

**Why it happens:** `@theme inline` bakes variable VALUES into utility classes at build time. The generated CSS for `bg-primary` becomes `background-color: oklch(0.45 0.12 250)` — a literal value, not `var(--color-primary)`. When dark mode changes `--color-primary` at runtime, none of the utilities pick it up because they're not referencing the variable anymore.

**Consequences:** Dark mode appears broken after migration even though build succeeds and no errors appear. All components using migrated color tokens lose dark mode toggling. This is the single most likely rewrite trigger in the design system phase.

**Prevention:** Use `@theme` (without `inline`) for all tokens that must respond to dark mode overrides. Only use `@theme inline` for static design tokens that never change between themes (e.g., fixed spacing scales, font families).

```css
/* WRONG — breaks dark mode */
@theme inline {
  --color-primary: oklch(0.45 0.12 250);
}

/* CORRECT — allows runtime override */
@theme {
  --color-primary: oklch(0.45 0.12 250);
}

/* Then override in dark mode */
.dark {
  --color-primary: oklch(0.65 0.12 250);
}
```

**Detection:** After migration, toggle dark mode in browser devtools. If computed background/text colors don't change, `@theme inline` is the cause.

---

### Pitfall 2: URL Change Without Immediate 301 Deploy = Permanent SEO Loss

**What goes wrong:** Team stages URL changes (aptSeq-based slugs) in a feature branch, deploys the new routes, then adds redirects "as a follow-up." The window between new route live and redirect live causes Googlebot to index both URLs or see 404s on old indexed pages.

**Why it happens:** aptSeq-based URLs differ from existing slugs. If old URLs return 404 even for a few hours on a production site, Google registers the pages as gone. Recovering from a 404 history takes longer than a clean redirect migration.

**Consequences:** Loss of accumulated page authority on apartment detail pages. Korean real estate search queries that ranked will drop. Recovery can take 4-8 weeks even after redirects are added.

**Prevention:** Redirects and new routes MUST be deployed in the same commit. The deployment order is: `next.config.js` redirects active → new routes active → sitemap updated → Google Search Console sitemap resubmission. Never merge new URLs without the redirect array already in place.

**Additional rule:** Maintain redirects for minimum 12 months. Next.js `permanent: true` issues a 308 (not 301) — this is fine for SEO, Google treats 308 = 301.

**Detection:** Run `curl -I https://donjup.com/[old-url]` after deploy. Must return `308` to new URL, not `404`.

---

### Pitfall 3: BLOB_READ_WRITE_TOKEN Missing in Local and Preview Environments

**What goes wrong:** Card news storage upload works in production but fails in local dev and preview deployments. Developers see `Error: BLOB_READ_WRITE_TOKEN is not defined` or `Failed to retrieve client token`.

**Why it happens:** Vercel auto-injects `BLOB_READ_WRITE_TOKEN` only in the project environment where the store was created. Local dev needs `vercel env pull .env.local` explicitly run. Preview branches need the env var linked in Vercel dashboard.

**Consequences:** Feature appears to work in production but breaks in dev, blocking iteration. Also breaks `vercel dev` for any developer who hasn't pulled env vars.

**Prevention:**
1. Run `vercel env pull .env.local` immediately after creating the blob store
2. Confirm `.env.local` is in `.gitignore` (never commit the token)
3. Link the store to Preview environments explicitly in Vercel dashboard Storage tab
4. Add a startup check: if `BLOB_READ_WRITE_TOKEN` is undefined in any server action, throw a descriptive error before attempting any blob operation

**Detection:** `vercel env ls` should show `BLOB_READ_WRITE_TOKEN` for Production, Preview, and Development scopes.

---

### Pitfall 4: Client Upload vs Server Upload — 4.5 MB Serverless Body Limit

**What goes wrong:** Server route receives image file via multipart form, passes it to `@vercel/blob` `put()`. Works locally. In production, any image over ~4MB fails with `413 Payload Too Large` from Vercel infrastructure — before the function code even runs.

**Why it happens:** Vercel serverless functions cap request body at 4.5 MB total. Card news images (especially Instagram-format 1080x1080) regularly exceed this.

**Consequences:** Upload silently fails or throws opaque errors. Instagram posting pipeline breaks on real-world image sizes.

**Prevention:** Use client-side upload pattern. The browser requests a one-time upload token from an API route, then uploads directly to Vercel Blob edge network, bypassing the 4.5 MB serverless limit entirely.

```typescript
// WRONG — routes all bytes through serverless
// POST /api/upload → serverless receives blob → put() to storage

// CORRECT — serverless only issues token, never touches bytes
// POST /api/upload-token → returns { url, token }
// Browser → direct PUT to Vercel Blob URL
```

Use `handleUpload` from `@vercel/blob/client` for the token-generation route.

**Detection:** Test with a 5MB PNG. If it fails in production but works locally, this is the cause.

---

## Moderate Pitfalls

---

### Pitfall 5: Arbitrary Value Syntax Change — bg-[--var] vs bg-(--var)

**What goes wrong:** Existing components using `bg-[--brand-color]` (v3 arbitrary syntax) silently produce no styling in v4. No build error, no console warning — the class just doesn't apply.

**Why it happens:** Tailwind v4 changed the CSS variable arbitrary value syntax from square brackets to parentheses. `bg-[--brand-color]` is not invalid syntax in v4 — it's treated as a literal color string `--brand-color`, which is invalid CSS and silently dropped.

**Prevention:** Run global search for `\[--` pattern before and after migration. The automated upgrade tool (`npx @tailwindcss/upgrade`) should catch most cases, but manually verify any custom components not in the upgrade tool's scope.

```bash
# Find all instances requiring syntax change
grep -r "\[--" src/ --include="*.tsx" --include="*.ts"
```

**Detection:** Visual regression — component appears unstyled. Inspect element shows `background-color: --brand-color` (invalid) instead of the resolved value.

---

### Pitfall 6: Default Border/Ring Color Changes Cause Subtle Visual Regressions

**What goes wrong:** After Tailwind v4 migration, form inputs, cards, and dividers appear with either no border or black borders where gray-200 was expected. Focus rings on interactive elements change from 3px blue to 1px currentColor.

**Why it happens:** v4 changed defaults silently:
- `border` default color: `gray-200` → `currentColor`
- `ring` default width: `3px` → `1px`
- `ring` default color: `blue-500` → `currentColor`
- `placeholder` color: `gray-400` → `currentColor` at 50% opacity

These affect every unstyled `border`, `ring`, and `placeholder` class across all components.

**Prevention:** After running `npx @tailwindcss/upgrade`, do a visual pass of every form, card, and interactive component in both light and dark mode. Add explicit color classes to any `border`, `ring`, or `placeholder` that relied on the v3 defaults.

**Detection:** Screenshot diff before/after migration. Focus visible states are the most commonly missed — test keyboard navigation.

---

### Pitfall 7: Price Format Change Breaks User Mental Model Without Warning

**What goes wrong:** Normalizing price display (e.g., `12,000만원` → `1.2억`) across components changes how users read rankings and charts. Users who memorized relative values against old format perceive the data as "changed" and distrust it.

**Why it happens:** Data display normalization is a UX change, not just a code change. Users build mental anchors around number formats they've seen repeatedly.

**Prevention:**
1. Keep the same format within any single page — don't mix formats across cards and charts on the same view
2. If changing the canonical format (e.g., always show 억 units), apply it everywhere simultaneously rather than component-by-component rollout
3. Prioritize normalization of null/empty display (less visible to users) before reformatting visible numbers

**Detection:** QA by checking the same apartment's price displayed on ranking card, detail page, and chart — all three must show identical formatted values.

---

### Pitfall 8: makeSlug Centralization Breaks Existing Links if Slug Algorithm Changes

**What goes wrong:** Centralizing slug generation is correct, but if the new `makeSlug` function produces a different string than the old scattered implementations (e.g., different Korean romanization, different separator), all existing bookmarks and shared links break even if 301 redirects cover Google's indexed URLs.

**Why it happens:** Multiple independent slug implementations often have subtle differences (trimming, special character handling, number formatting). Centralizing reveals these differences.

**Prevention:** Before centralizing, audit all existing slug-generation code across the codebase. The new `makeSlug` must produce identical output to the most common existing implementation for all existing apartment names in the DB. Run both old and new implementations against the full apartment list and diff the outputs — zero differences required.

```typescript
// Validation test: run against all apt names in DB
const results = apartments.map(apt => ({
  old: oldMakeSlug(apt.name),
  new: makeSlug(apt.name),
  match: oldMakeSlug(apt.name) === makeSlug(apt.name)
}));
const mismatches = results.filter(r => !r.match);
// Must be empty before merging
```

**Detection:** `mismatches.length > 0` in the validation test above.

---

## Minor Pitfalls

---

### Pitfall 9: theme() Function Deprecated — Build Warnings Accumulate

**What goes wrong:** CSS files using `theme(colors.gray.200)` (v3 syntax) produce deprecation warnings in v4. These don't break builds but accumulate over time and mask real errors.

**Prevention:** Replace all `theme()` calls with `var(--color-gray-200)` during migration. Use search: `theme(` in CSS files.

---

### Pitfall 10: Vercel Blob Region Lock — Store Created in Wrong Region

**What goes wrong:** Blob store created in `us-east-1` causes high latency for Korean users accessing card news images. Region cannot be changed after store creation — requires deleting and recreating the store.

**Prevention:** Create the blob store in the region closest to the primary user base. For donjup.com (Korean users), choose the Asia-Pacific region. Verify region before creating the store in the Vercel dashboard.

---

### Pitfall 11: Sitemap Missing aptSeq-Based URLs at Launch

**What goes wrong:** New aptSeq URL structure is deployed and redirects work, but the sitemap still contains old URLs. Google follows redirects but the canonical signal is weakened. New apartments added after launch are missing from sitemap entirely.

**Prevention:** Sitemap must be dynamic (DB-driven), not static. Generate from `SELECT apt_seq FROM apt_complexes` at sitemap generation time. Submit updated sitemap in Google Search Console within 24 hours of URL structure deployment.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| CSS Variable Migration | `@theme inline` breaks dark mode (Pitfall 1) | Audit all tokens: only `@theme` for theme-responsive values |
| CSS Variable Migration | Arbitrary value syntax `[--]` → `(--)` (Pitfall 5) | Grep for `\[--` pattern, verify upgrade tool coverage |
| CSS Variable Migration | Border/ring/placeholder default changes (Pitfall 6) | Screenshot diff entire component library before/after |
| URL Restructure | Redirect missing on deploy day (Pitfall 2) | Redirects in same commit as new routes — no exceptions |
| URL Restructure | makeSlug algorithm mismatch (Pitfall 8) | Full DB diff test before merge |
| URL Restructure | Sitemap not updated (Pitfall 11) | Dynamic sitemap generation, resubmit GSC day-of |
| Blob Storage | Token missing in dev/preview (Pitfall 3) | `vercel env pull` + verify all scopes |
| Blob Storage | 4.5 MB serverless body limit (Pitfall 4) | Client-side upload pattern from day one |
| Blob Storage | Wrong region (Pitfall 10) | Choose AP region before store creation |
| Data Normalization | Price format breaks user mental model (Pitfall 7) | Normalize null/empty first, then number format atomically |

---

## Sources

- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) — official, HIGH confidence
- [Tailwind v4 @theme vs @theme inline discussion](https://github.com/tailwindlabs/tailwindcss/discussions/18560) — community, MEDIUM confidence
- [Upgrading to Tailwind v4: Missing Defaults, Broken Dark Mode](https://github.com/tailwindlabs/tailwindcss/discussions/16517) — real-world reports, MEDIUM confidence
- [Tailwind CSS v4.0 blog post](https://tailwindcss.com/blog/tailwindcss-v4) — official, HIGH confidence
- [Google: Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects) — official, HIGH confidence
- [Google: Site Moves with URL Changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) — official, HIGH confidence
- [Next.js redirect permanent creates cache issue](https://www.seocomponent.com/blog/nextjs-redirect-permanent-cache/) — community, MEDIUM confidence
- [Vercel Blob documentation](https://vercel.com/docs/vercel-blob) — official, HIGH confidence
- [Vercel: No token found discussion](https://github.com/vercel/community/discussions/5159) — community report, MEDIUM confidence
- [Vercel: How to bypass 4.5MB body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — official, HIGH confidence
