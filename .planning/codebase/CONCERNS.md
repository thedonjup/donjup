# Codebase Concerns

**Analysis Date:** 2026-03-26

## Tech Debt

**Custom Query Builder mimicking Supabase API:**
- Issue: `src/lib/db/client.ts` (844 lines) is a hand-rolled SQL query builder that emulates the Supabase PostgREST API. It was created to migrate from Supabase to direct PostgreSQL (via `pg`), but the Supabase-style `.from().select().eq()` API is preserved as a compatibility shim. This adds maintenance burden and hides SQL behind an abstraction that is neither Supabase nor a proper ORM.
- Files: `src/lib/db/client.ts`, `src/lib/supabase/server.ts`
- Impact: Any developer must understand both the Supabase API conventions AND the custom implementation. Bugs in the query builder (e.g., parameter index tracking in `rebuildConditionParams`) affect all database operations silently.
- Fix approach: Either adopt a lightweight query builder (e.g., Kysely, Drizzle) or fully commit to raw SQL with parameterized queries. Remove the Supabase facade.

**Storage stub that always fails:**
- Issue: `StorageBucketApi.upload()` in `src/lib/db/client.ts` (lines 786-800) is a stub that logs a warning and returns an error. Code calling `supabase.storage.from(...).upload(...)` will silently fail.
- Files: `src/lib/db/client.ts` (lines 779-817)
- Impact: Any feature relying on file uploads is broken. The `getPublicUrl` method references a `NEXT_PUBLIC_SUPABASE_URL` env var that may no longer be relevant.
- Fix approach: Implement storage via Vercel Blob, S3, or another provider. Remove or replace the stub.

**Duplicate `formatPrice` function:**
- Issue: `formatPrice` is defined locally in `src/components/map/KakaoMap.tsx` (line 41) AND exported from `src/lib/format.ts` (line 2). Both have identical logic.
- Files: `src/components/map/KakaoMap.tsx`, `src/lib/format.ts`
- Impact: Maintenance burden; changes to formatting logic must be applied in two places.
- Fix approach: Remove the local copy in KakaoMap.tsx and import from `@/lib/format`.

**Duplicate Instagram API client files:**
- Issue: Two separate Instagram integration files exist with overlapping functionality.
- Files: `src/lib/api/instagram.ts` (simple Graph API wrapper), `src/lib/instagram/client.ts` (291 lines, includes rate limiting)
- Impact: Unclear which module to use for Instagram operations; potential for drift.
- Fix approach: Consolidate into a single Instagram client module.

**Pervasive `any` type usage:**
- Issue: `eslint-disable @typescript-eslint/no-explicit-any` appears in 4 files. Beyond that, `any` is used approximately 80 times across `.ts` files and 29 times across `.tsx` files. The query builder itself is almost entirely `any`-typed.
- Files: `src/lib/db/client.ts` (45 occurrences), `src/app/page.tsx` (9 occurrences), `src/components/map/KakaoMap.tsx` (6 occurrences)
- Impact: Type safety is severely diminished in core data access and rendering layers. Runtime type errors are likely.
- Fix approach: Define interfaces for database row types (transactions, complexes, rates). Type the query builder generics or replace it.

## Security Considerations

**SSL certificate verification disabled:**
- Risk: `ssl: { rejectUnauthorized: false }` in the database connection pool (`src/lib/db/client.ts`, line 17) disables TLS certificate validation, making the connection vulnerable to MITM attacks.
- Files: `src/lib/db/client.ts` (line 17)
- Current mitigation: None.
- Recommendations: Set `rejectUnauthorized: true` or provide a proper CA certificate via `ssl.ca`.

**Admin email list exposed as NEXT_PUBLIC env var:**
- Risk: `NEXT_PUBLIC_ADMIN_EMAILS` is a public environment variable, meaning admin email addresses are bundled into client-side JavaScript and visible to anyone inspecting the page source.
- Files: `src/lib/admin/auth.ts` (line 3)
- Current mitigation: Admin authorization still requires a valid Firebase ID token; the email list alone does not grant access.
- Recommendations: Move admin email checking to server-side only using a non-`NEXT_PUBLIC` env var. The `isAdmin` function is only called server-side anyway.

**No Content-Security-Policy header:**
- Risk: The `next.config.ts` sets security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy) but does NOT include a Content-Security-Policy header. This leaves the app more vulnerable to XSS via injected scripts.
- Files: `next.config.ts` (lines 5-21)
- Current mitigation: `dangerouslySetInnerHTML` usage is limited to JSON-LD structured data and a theme initialization script, which are controlled server-side.
- Recommendations: Add a CSP header, at minimum `default-src 'self'; script-src 'self' 'unsafe-inline'` (adjust for Kakao SDK, AdSense, Firebase, etc.).

**DAM content management endpoints lack proper auth:**
- Risk: `src/app/api/dam/content/route.ts` PATCH endpoint allows updating content status (e.g., marking as "posted") with no authentication check at all. GET is also unauthenticated.
- Files: `src/app/api/dam/content/route.ts`
- Current mitigation: None visible. The endpoint is publicly accessible.
- Recommendations: Add CRON_SECRET or Firebase admin token verification to all DAM mutation endpoints.

**Push subscription endpoint has no rate limiting or abuse prevention:**
- Risk: `src/app/api/push/subscribe/route.ts` accepts any POST body with endpoint/keys and upserts into `push_subscriptions` without authentication, CAPTCHA, or rate limiting.
- Files: `src/app/api/push/subscribe/route.ts`
- Current mitigation: The in-memory rate limiter in `src/proxy.ts` applies broadly to API routes (60 req/min per IP), but this is easily bypassed with distributed requests.
- Recommendations: Require Firebase authentication for push subscriptions, or at minimum add per-endpoint stricter rate limits.

**SQL injection surface in search API:**
- Risk: While the search API in `src/app/api/search/route.ts` uses parameterized queries (good), it manually constructs SQL strings with user input determining query structure (which conditions are added). The manual `paramIdx` tracking is error-prone.
- Files: `src/app/api/search/route.ts` (lines 40-160)
- Current mitigation: Parameters are properly escaped via `$N` placeholders.
- Recommendations: The parameterized approach is correct, but consider using the query builder or a dedicated search solution to reduce manual SQL construction.

**Error messages leak internal details:**
- Risk: The DB client in `src/lib/db/client.ts` (line 725) enriches errors with full SQL statements and parameter values. If these propagate to API responses, they could leak schema details.
- Files: `src/lib/db/client.ts` (lines 723-728), `src/app/api/search/route.ts` (line 165)
- Current mitigation: Most API handlers catch errors and return generic messages, but `src/app/api/search/route.ts` returns `e.message` directly (line 165).
- Recommendations: Never return raw error messages in production API responses. Log them server-side only.

## Performance Bottlenecks

**In-memory rate limiter does not persist across serverless invocations:**
- Problem: `src/proxy.ts` uses an in-memory `Map` for rate limiting. In a serverless environment (Vercel), each function invocation gets a fresh memory space, so the rate limiter resets frequently and provides minimal protection.
- Files: `src/proxy.ts`
- Cause: Serverless functions are stateless; the `rateLimitMap` is recreated on cold starts.
- Improvement path: Use Vercel KV, Upstash Redis, or Vercel's built-in rate limiting for persistent rate limiting across invocations.

**Homepage makes up to 7 database queries on cache miss:**
- Problem: `src/app/page.tsx` (line 59) first checks `homepage_cache` table, but on cache miss, it falls back to multiple parallel queries for drops, highs, volume, recent, rates, counts, and popular items.
- Files: `src/app/page.tsx` (lines 55-140 approximately)
- Cause: No guarantee the cache is always warm.
- Improvement path: The cache strategy (with `revalidate = 300`) is sound but ensure the `homepage_cache` is always populated by the cron job. Consider a materialized view or pre-aggregated table.

**Search API performs ILIKE queries without full-text search index:**
- Problem: `src/app/api/search/route.ts` uses `ILIKE '%keyword%'` which cannot use standard B-tree indexes (requires sequential scan or trigram index).
- Files: `src/app/api/search/route.ts`
- Cause: ILIKE with leading wildcard defeats index usage.
- Improvement path: Add `pg_trgm` GIN indexes on `apt_name`, `region_name`, `dong_name` columns, or implement PostgreSQL full-text search (`to_tsvector`/`to_tsquery`).

**Large page components with no code splitting:**
- Problem: Several page components are very large: `src/app/rate/calculator/page.tsx` (1101 lines), `src/app/page.tsx` (658 lines), `src/components/map/KakaoMap.tsx` (640 lines), `src/app/apt/[region]/[slug]/page.tsx` (551 lines).
- Files: Listed above
- Cause: All logic, UI, and state management in single files.
- Improvement path: Extract sub-components and utility functions. Use dynamic imports for heavy components like the Kakao map and Recharts.

## Fragile Areas

**Query builder parameter index tracking:**
- Files: `src/lib/db/client.ts` (lines 96-99, 553-576)
- Why fragile: The `paramIdx` counter and `rebuildConditionParams()` method manually track `$N` placeholder indices across chained operations. For UPDATE queries, the indices must be rebuilt to account for SET clause parameters. Any off-by-one error silently corrupts queries.
- Safe modification: Write integration tests against a test database before changing any parameter logic.
- Test coverage: Zero tests exist.

**Cron job orchestration via Vercel cron:**
- Files: `vercel.json` (22 cron entries), all files under `src/app/api/cron/`
- Why fragile: 22 cron jobs run on overlapping schedules (e.g., 5 transaction batches between 20:00-20:40, 5 rent batches on the same windows). All share the same database connection pool (`max: 5`). Concurrent execution could exhaust connections.
- Safe modification: Monitor database connection usage; consider increasing pool size or staggering schedules further.
- Test coverage: No tests for any cron jobs.

**Region code constants:**
- Files: `src/lib/constants/region-codes.ts` (421 lines)
- Why fragile: Hard-coded Korean administrative region codes and names. Any redistricting or code changes by the government requires manual updates.
- Safe modification: Update the constants file; search for all usages of region codes across the codebase.
- Test coverage: None.

## Test Coverage Gaps

**Zero test files exist in the entire codebase:**
- What's not tested: Everything. No unit tests, integration tests, or E2E tests.
- Files: No `*.test.*`, `*.spec.*`, or `__tests__/` directories found. No `jest.config.*` or `vitest.config.*` exists.
- Risk: Any code change could introduce regressions that go undetected until production. The custom query builder, cron jobs, API routes, and financial calculators are all untested.
- Priority: **Critical**. At minimum, test:
  1. `src/lib/db/client.ts` - Query builder SQL generation
  2. `src/app/api/search/route.ts` - Search parameter handling
  3. `src/app/rate/calculator/page.tsx` - Financial calculation logic
  4. `src/lib/format.ts` - Formatting utilities
  5. Cron job data parsing (`src/lib/api/molit.ts`, `src/lib/api/reb.ts`)

## Dependencies at Risk

**Multiple PostgreSQL client libraries:**
- Risk: Three separate PostgreSQL packages are installed: `pg` (8.20.0), `postgres` (3.4.8), and `@neondatabase/serverless` (1.0.2). Only `pg` appears to be actively used via `src/lib/db/client.ts`.
- Files: `package.json` (lines 12-15)
- Impact: Unnecessary bundle size and dependency maintenance.
- Migration plan: Remove `postgres` and `@neondatabase/serverless` if unused, or consolidate to one driver.

**Supabase naming remnants:**
- Risk: The codebase migrated from Supabase but retains Supabase naming conventions. `src/lib/supabase/server.ts` is just a wrapper that calls `createDbClient()`. Import paths like `@/lib/supabase/server` are misleading.
- Files: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/rent-client.ts`
- Impact: Confuses developers about the actual data access layer.
- Migration plan: Rename `src/lib/supabase/` to `src/lib/db/` and update all imports.

**Firebase SDK is very large:**
- Risk: `firebase` (12.11.0) is a large client-side dependency. It is used for authentication and Firestore comments.
- Files: `src/lib/firebase/config.ts`, `src/components/auth/LoginModal.tsx`
- Impact: Significant bundle size impact for client-side pages.
- Migration plan: Consider using Firebase modular imports (tree-shaking) or replacing with a lighter auth solution.

## Missing Critical Features

**No middleware.ts for route protection:**
- Problem: There is no Next.js middleware file (`src/middleware.ts`). The `proxy.ts` file exports a `proxy()` function and a `config` object but is not wired as Next.js middleware.
- Blocks: Centralized auth checks, proper rate limiting, redirect logic, and request logging cannot be applied consistently.

**No error boundary or global error page:**
- Problem: No `error.tsx` or `global-error.tsx` files found for error boundaries in the App Router.
- Blocks: Unhandled errors in server components render the default Next.js error page instead of a branded error experience.

**No logging infrastructure:**
- Problem: All logging uses `console.log`, `console.warn`, and `console.error` (39 total occurrences across 23 files). No structured logging, no log levels, no external log aggregation.
- Blocks: Production debugging, error tracking, and performance monitoring.

## Accessibility Issues

**Minimal ARIA and accessibility attributes:**
- Problem: Only 15 total ARIA/role/alt/tabIndex attributes across 9 component files. For a public-facing content-heavy site, this is far below acceptable levels.
- Files: Most components under `src/components/` lack semantic HTML and accessibility attributes.
- Key gaps:
  - `src/components/map/KakaoMap.tsx` - Map markers have no keyboard navigation or screen reader alternatives
  - Interactive tabs (`src/components/home/RankingTabs.tsx`, `src/components/apt/TransactionTabs.tsx`) have minimal ARIA roles
  - Chart components (`src/components/charts/`) have no text alternatives
  - No skip navigation link in `src/app/layout.tsx`
- Priority: Medium - affects user experience for assistive technology users and can impact SEO.

## Scaling Limits

**Database connection pool size:**
- Current capacity: `max: 5` connections in `src/lib/db/client.ts` (line 18)
- Limit: With 22 cron jobs potentially running concurrently plus user traffic, 5 connections could be exhausted. Serverless functions create separate pools per instance.
- Scaling path: Use a connection pooler like PgBouncer or Neon's built-in pooler. Increase pool size or use serverless-optimized driver.

**Cron jobs with 5-minute max duration:**
- Current capacity: `maxDuration = 300` (5 minutes) for transaction fetch crons
- Limit: As data volume grows, fetching and upserting transactions for all regions in a single batch may exceed the timeout.
- Scaling path: Further subdivide batches or move to background job processing (e.g., Vercel Functions with streaming, or external queue).

---

*Concerns audit: 2026-03-26*
