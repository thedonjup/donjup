# Feature Research

**Domain:** Production Next.js site stabilization — real estate data platform (donjup.com)
**Researched:** 2026-03-26
**Confidence:** HIGH (based on codebase analysis, automated QA report, and documented concerns)

## Feature Landscape

This is a stabilization milestone, not a new-feature milestone. "Features" here means improvements that fix
degraded site quality. The framing is: what does a production site need that this one currently lacks?

---

### Table Stakes (Users and Search Engines Expect These)

Features that, when absent or broken, directly degrade trust, discoverability, or functional correctness.
Missing these = the site is broken by industry standards.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Correct canonical URLs on all pages | Google treats wrong canonical as duplicate content; 17+ pages currently point to root — SEO is catastrophically broken | LOW | Single metadata fix in layout/page files; `themes/reconstruction` already works as the pattern to follow |
| Page-specific `<title>` tags | `/compare`, `/profile`, `/dam` use the default site title — misleads search results and browser tabs | LOW | Add `export const metadata` to each page; no data fetching needed |
| Error boundary pages (`error.tsx`, `global-error.tsx`) | Unhandled server component errors currently show Next.js default error screen with no branding or recovery path | LOW | App Router error boundary convention; two files to add |
| No internal details in API error responses | `search/route.ts` returns raw `e.message` which may leak SQL schema info to clients | LOW | Replace with generic message; log detail server-side only |
| Security: ADMIN_EMAILS out of NEXT_PUBLIC | Admin email list is currently bundled into client-side JS and visible in page source | LOW | Rename env var, move check to server-only code path |
| DAM endpoint authentication | `api/dam/content` PATCH has zero auth — any public request can mutate content status | LOW | Add CRON_SECRET or Firebase admin token check |
| SSL certificate verification enabled | `rejectUnauthorized: false` in DB pool disables TLS validation — MITM-vulnerable | LOW | Set to `true` or provide CA cert; Neon supports standard TLS |
| Structured error logging (replace console.log) | 39 `console.*` calls across 23 files give no log levels, no correlation IDs, no aggregation — production debugging is guesswork | MEDIUM | Adopt a minimal structured logger (e.g., `pino`) with Vercel log drains; or a thin wrapper over `console` that adds severity and request context |
| Remove storage upload stub | `supabase.storage.from().upload()` always fails silently — any code path hitting it is broken | LOW | Remove stub; if upload is needed, implement properly; if unused, delete callers |
| Deduplication: `formatPrice` | Identical function in two files — next change to price formatting will silently diverge | LOW | Remove local copy in `KakaoMap.tsx`, import from `@/lib/format` |
| Remove unused PostgreSQL packages | `postgres` and `@neondatabase/serverless` are installed but not used — dead weight in bundle | LOW | `npm uninstall postgres @neondatabase/serverless` |
| Rename `src/lib/supabase/` to `src/lib/db/` | Misleading path makes every developer question which DB layer is real | LOW-MEDIUM | Rename directory and update all imports; no logic change |
| Fix in-memory rate limiter for serverless | Current `Map`-based rate limiter resets on every cold start — provides near-zero protection on Vercel | MEDIUM | Replace with Vercel KV or Upstash Redis; or use Vercel's native rate limiting |
| Stagger overlapping cron job schedules | 5 transaction batches + 5 rent batches on identical 20:00–20:40 windows compete for the 5-connection pool | LOW | Spread schedules by 2–5 minutes each in `vercel.json` |
| CSP header | `next.config.ts` sets 5 security headers but no Content-Security-Policy — XSS surface is open | MEDIUM | Add CSP tuned for Kakao SDK, AdSense, Firebase, and the JSON-LD inline scripts already in use |

---

### Differentiators (Competitive Advantage — Nice but Not Blocking)

These improve the site quality beyond baseline but do not fix broken behavior. Worth doing during stabilization
if time and risk allow.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-page OG images for major pages | SNS shares of `/today`, `/new-highs`, `/market`, `/rate` currently show generic logo — kills click-through rates from social | MEDIUM | Next.js `opengraph-image.tsx` convention; main page already has the pattern; extend to 4–5 key pages |
| Search API: `pg_trgm` GIN index | ILIKE with leading wildcard does sequential table scans — search slows linearly as data grows | MEDIUM | `CREATE INDEX CONCURRENTLY` with `gin_trgm_ops`; no application code change required |
| Code-split large components | `calculator/page.tsx` (1101 lines), `KakaoMap.tsx` (640 lines) block code review and inflate initial JS | MEDIUM | Extract sub-components; use `next/dynamic` with `ssr: false` for the Kakao map (already client-only) |
| TypeScript: type core DB rows | 80+ `any` usages concentrated in `db/client.ts` (45), `page.tsx` (9), `KakaoMap.tsx` (6) — runtime errors undetectable at compile time | MEDIUM | Define interfaces for `Transaction`, `Complex`, `Rate`; thread generics into query builder |
| Consolidate Instagram client duplication | Two Instagram modules with overlapping functionality — unclear which to extend | LOW | Keep the 291-line version with rate limiting; delete the simpler wrapper |
| Map page: loading skeleton instead of empty-state text | SSR renders "좌표가 있는 거래 데이터가 없습니다" on initial load before client JS hydrates — poor first impression | LOW | Replace empty-state message with loading skeleton; SSR cannot hydrate Kakao map |
| Push subscription endpoint hardening | Unauthenticated POST can flood `push_subscriptions` table with arbitrary data | LOW | Require Firebase auth token on subscribe; reject unauthenticated requests |
| Accessibility baseline (ARIA + keyboard nav) | Only 15 ARIA attributes across 9 components — fails basic screen reader and keyboard navigation | HIGH | Audit interactive tabs, chart components, map markers; add role/aria-label/tabIndex; add skip-nav link (QA says it exists, codebase says it's minimal) |
| DB connection pool: migrate to serverless-aware driver | `pg` pool with `max:5` creates a separate pool per serverless instance — actual ceiling is much lower than 5 | HIGH | Migrate to `@neondatabase/serverless` with HTTP mode, or PgBouncer; eliminates pool exhaustion under cron concurrency |

---

### Anti-Features (Things to Deliberately NOT Do During Stabilization)

These are changes that might seem like improvements but would violate the scope, introduce new risk, or create
a bigger problem than they solve.

| Feature | Why Requested | Why to Avoid | Alternative |
|---------|---------------|--------------|-------------|
| ORM migration (Drizzle/Kysely) | Custom query builder is ugly and fragile | Full swap risks breaking all 22 cron jobs and every data page simultaneously; zero test coverage makes this a rewrite gamble | Improve typing and clarity of existing builder; defer ORM migration to a dedicated milestone with test scaffolding first |
| New user-facing features (DSR calculator, multi-property types) | Roadmap has them in v3 | This milestone is stabilization-only; adding features while fixing bugs splits focus and adds regression surface | Track in `docs/11-renewal-v3-master-plan.md`; do not touch |
| UI redesign | Designer may have ideas | Any CSS/component-level redesign during a stability push invalidates QA baselines | Defer to post-stabilization milestone |
| Full test infrastructure (Jest/Vitest + Playwright) | Zero test coverage is genuinely critical | Test infrastructure setup is a milestone of its own; doing it mid-stabilization adds tooling overhead without delivering site fixes | Add a dedicated "Testing" milestone after stabilization completes |
| Firebase → alternative auth migration | Firebase SDK is large and adds bundle weight | Auth replacement is a multi-week effort with risk of user session disruption | Use Firebase tree-shaking (`firebase/auth` modular imports) to reduce bundle size without migration |
| Supabase query builder full replacement (raw SQL) | Builder hides SQL and is fragile | Rewriting all queries to raw SQL without tests is extremely high risk of regressions | Clean up naming (rename `/supabase/` to `/db/`), improve types — leave query structure intact |
| Aggressive TypeScript strict mode (`noImplicitAny` globally) | 109 `any` usages need fixing eventually | Enabling strict globally breaks the build immediately; mass-fixing `any` without understanding each callsite introduces bugs | Fix `any` in critical paths only (DB row types, API responses); enable strict incrementally per-file |
| Real-time features (WebSocket, live updates) | Real-time prices sound compelling | Serverless Vercel cannot maintain persistent connections; Neon free tier is not suited for high-frequency polling | Keep current SSR + cron + cache pattern; it already handles freshness adequately |

---

## Feature Dependencies

```
[Structured logging]
    └──enables──> [Production debugging of all other fixes]
    └──enables──> [Rate limiter effectiveness measurement]

[SSL rejectUnauthorized fix]
    └──prerequisite for──> [Security hardening phase]

[ADMIN_EMAILS server-only]
    └──prerequisite for──> [DAM endpoint authentication]
    └──part of──> [Security hardening phase]

[CSP header]
    └──requires knowledge of──> [All third-party scripts: Kakao, AdSense, Firebase]
    └──best done after──> [Code split / dynamic imports settled]

[pg_trgm index]
    └──independent of──> [Application code]
    └──enhances──> [Search API]

[Duplicate formatPrice removal]
    └──prerequisite for──> [KakaoMap.tsx TypeScript any cleanup]

[Supabase → db rename]
    └──enables──> [Clarity for TypeScript type improvements]
    └──requires──> [All import paths updated simultaneously]

[Remove unused PostgreSQL packages]
    └──independent of──> [All other changes]

[Error boundaries]
    └──independent of──> [Other fixes]
    └──enhances──> [User trust during any remaining bugs]

[Cron schedule stagger]
    └──partially mitigates──> [DB connection pool exhaustion]
    └──does NOT fully solve──> [Need serverless-aware driver for full fix]

[DB serverless driver migration]
    └──conflicts with──> [Current pg pool configuration]
    └──high risk; defer to──> [Post-stabilization unless exhaustion is observed in production]
```

### Dependency Notes

- **Security phase last:** CONCERNS.md and PROJECT.md both specify security work goes last — other changes may introduce new issues that need consolidating. Do not scatter security fixes across phases.
- **Logging before debugging:** Structured logging should be early so subsequent debugging work benefits from it.
- **CSP requires third-party inventory:** Adding CSP without knowing all script sources will break Kakao maps, AdSense, and Firebase Auth. Inventory first.
- **Supabase rename is a broad import change:** Touches many files at once; safest to do as a single atomic commit with a find-and-replace, not incrementally.

---

## MVP Definition (Stabilization Context)

In stabilization, "MVP" means the minimum work that makes the site trustworthy at production standards.

### Phase 1: Critical Fixes (Blocker-level)

- [ ] Canonical URL fix — SEO is broken for 17+ pages RIGHT NOW, every day without a fix loses search ranking
- [ ] Page titles for `/compare`, `/profile`, `/dam` — trivial, blocks nothing, completes SEO baseline
- [ ] Error boundaries (`error.tsx`, `global-error.tsx`) — unhandled errors show naked Next.js defaults
- [ ] Search API error message sanitization — leaks internal details in production right now
- [ ] Remove storage upload stub — silent failures confuse any future developer

### Phase 2: Code Quality (Reduces Maintenance Debt)

- [ ] Deduplicate `formatPrice` — LOW effort, clear win
- [ ] Consolidate Instagram clients — LOW effort, clear win
- [ ] Remove unused PostgreSQL packages — 5-minute change
- [ ] Rename `src/lib/supabase/` to `src/lib/db/` — naming correctness, moderate scope
- [ ] TypeScript: type DB row interfaces — reduces runtime error surface in critical data paths
- [ ] Structured logging foundation — makes all future debugging faster

### Phase 3: Performance (Correctness Under Load)

- [ ] Stagger cron job schedules — prevents DB pool exhaustion during batch runs
- [ ] `pg_trgm` GIN index on search columns — protects search latency as data grows
- [ ] Code-split large components (`KakaoMap`, `calculator`) — improves client load time
- [ ] In-memory rate limiter → persistent (Upstash Redis or Vercel KV)

### Phase 4: Security (Final Consolidation)

- [ ] SSL `rejectUnauthorized: true`
- [ ] `ADMIN_EMAILS` moved to server-only env var
- [ ] DAM content endpoints authentication
- [ ] Push subscription endpoint auth
- [ ] CSP header (requires full third-party script inventory)

### Deferred (Not This Milestone)

- [ ] Full accessibility audit — important, but HIGH complexity and out of scope per PROJECT.md
- [ ] DB serverless driver migration — HIGH risk without tests
- [ ] ORM migration — separate milestone
- [ ] Test infrastructure — separate milestone
- [ ] Per-page OG images — nice-to-have; main SEO issue is canonical, not OG

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Canonical URL fix | HIGH (SEO ranking) | LOW | P1 |
| Page titles (`compare`, `profile`, `dam`) | MEDIUM (SEO, UX) | LOW | P1 |
| Error boundaries | MEDIUM (trust, UX) | LOW | P1 |
| Search API error sanitization | MEDIUM (security) | LOW | P1 |
| Remove storage stub | LOW (silent failure) | LOW | P1 |
| SSL rejectUnauthorized fix | HIGH (security) | LOW | P1 (Phase 4) |
| ADMIN_EMAILS server-only | MEDIUM (info disclosure) | LOW | P1 (Phase 4) |
| DAM endpoint auth | HIGH (data integrity) | LOW | P1 (Phase 4) |
| CSP header | MEDIUM (XSS surface) | MEDIUM | P1 (Phase 4) |
| Structured logging | MEDIUM (ops) | MEDIUM | P2 |
| Deduplicate formatPrice | LOW (DX) | LOW | P2 |
| Consolidate Instagram clients | LOW (DX) | LOW | P2 |
| Remove unused pg packages | LOW (hygiene) | LOW | P2 |
| Supabase → db rename | LOW (DX) | MEDIUM | P2 |
| TypeScript DB row types | MEDIUM (safety) | MEDIUM | P2 |
| Cron schedule stagger | MEDIUM (reliability) | LOW | P2 |
| pg_trgm GIN index | MEDIUM (search perf) | LOW | P2 |
| Code-split large components | MEDIUM (load time) | MEDIUM | P2 |
| In-memory rate limiter fix | MEDIUM (security) | MEDIUM | P2 |
| Push subscription auth | LOW (abuse surface) | LOW | P2 |
| Per-page OG images | MEDIUM (social CTR) | MEDIUM | P3 |
| Map page loading skeleton | LOW (polish) | LOW | P3 |
| Accessibility audit | HIGH (inclusivity) | HIGH | P3 (own milestone) |
| DB serverless driver | HIGH (scaling) | HIGH | P3 (post-stabilization) |

**Priority key:**
- P1: Must fix — broken or security-critical
- P2: Should fix — quality and reliability, moderate effort
- P3: Nice to have or own milestone

---

## Sources

- `.planning/PROJECT.md` — Active requirements list (2026-03-26)
- `.planning/codebase/CONCERNS.md` — Detailed codebase audit (2026-03-26)
- `docs/qa-report.md` — Automated QA scan of all 21 pages (2026-03-25)
- Next.js App Router conventions: error boundaries (`error.tsx`, `global-error.tsx`) are standard Next.js 13+ patterns
- PostgreSQL `pg_trgm` extension: standard approach for ILIKE-equivalent indexed search

---
*Feature research for: donjup.com production stabilization*
*Researched: 2026-03-26*
