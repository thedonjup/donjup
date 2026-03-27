# Codebase Concerns

**Analysis Date:** 2026-03-27

## Tech Debt

**Unverified API Response Parsing:**
- Issue: Multiple API integrations have TODO comments indicating parsing logic is not fully verified against actual API responses
- Files: `src/lib/api/reb.ts`, `src/lib/api/molit.ts`
- Impact: Risk of silent data loss or incorrect parsing if API responses differ from expected format; crashes on unexpected field names
- Fix approach: Test each API integration against live API, add strict validation for response structure, implement schema validation with zod or similar

**Database Connection Pool Error Recovery:**
- Issue: Pool connection drops trigger reset but callers may not handle null pool state correctly
- Files: `src/lib/db/client.ts` (lines 21-25)
- Impact: Requests made between pool error and recreate may fail silently
- Fix approach: Implement queue-based retry mechanism or explicit connection state check in execute()

**Service Worker Cache Version Drift:**
- Issue: CACHE_NAME is hardcoded ("donjup-v3") with no automatic version update when assets change
- Files: `public/sw.js` (line 1)
- Impact: Manual cache version bumps required to invalidate; users may see stale content if version forgotten
- Fix approach: Auto-generate cache version from build hash via next.config.ts

**QueryBuilder Parameter Indexing Complexity:**
- Issue: Manual parameter index tracking across complex WHERE/SET clauses is error-prone; rebuildConditionParams() is difficult to verify
- Files: `src/lib/db/client.ts` (lines 551-574)
- Impact: SQL injection risk if parameter mapping fails; difficult to debug parameter misalignment
- Fix approach: Refactor to use named parameters or abstraction layer that handles indexing automatically

## Known Bugs

**Slug Resolution Fallback Chain Issues:**
- Issue: Slug parsing uses substring matching which may match wrong complexes if similar slug suffixes exist
- Files: `src/app/apt/[region]/[slug]/page.tsx` (lines 40-59)
- Impact: Wrong apartment detail page may load; edge cases with region code parsing
- Fix approach: Use exact slug match first; only fallback if not found. Add logging to detect fallback usage.

**API XML Parsing Fragility:**
- Issue: Multiple XML parsers use simple regex extraction without error handling for malformed XML
- Files: `src/lib/api/molit.ts` (line 81), `src/lib/api/molit-rent.ts`, `src/lib/api/reb.ts` (line 101)
- Impact: Malformed API responses cause silent failure (empty array return) with no indication to caller
- Fix approach: Use proper XML parser (fast-xml-parser or similar); add error tracking/logging

**Date Formatting Edge Cases:**
- Issue: Date conversion in query response (line 719) splits on "T" which works for ISO but may fail for other formats
- Files: `src/lib/db/client.ts` (line 719)
- Impact: Unexpected date format from DB could cause React rendering errors
- Fix approach: Use ISO date validation library; add type guard

## Security Considerations

**Database SSL Configuration:**
- Risk: Production CockroachDB connection uses `ssl: { rejectUnauthorized: false }` — accepts any cert
- Files: `src/lib/db/client.ts` (line 16), documented in CLAUDE.md
- Current mitigation: Only production URL used; connection string from env
- Recommendations: Add cert pinning or move to managed CockroachDB with proper certs; document this is temporary limitation

**Missing Input Validation on Search:**
- Risk: Search queries passed directly to ILIKE without limit/sanitization
- Files: `src/app/search/page.tsx` (lines 96, 99)
- Current mitigation: ILIKE uses parameterized queries (safe from SQL injection)
- Recommendations: Add max length limits (e.g., 100 chars); sanitize for LIKE wildcards if user input contains %/_

**Environment Variable Exposure via Error Messages:**
- Risk: Some errors logged include request URL which may contain API keys if misconfigured
- Files: `src/lib/db/client.ts` (line 727)
- Current mitigation: Only in error context, not sent to client
- Recommendations: Strip sensitive params before logging; use token masking for API keys

**Instagram API Token Management:**
- Risk: INSTAGRAM_ACCESS_TOKEN stored in process.env with no rotation mechanism
- Files: `src/lib/instagram/client.ts` (lines 18-26)
- Current mitigation: Token is long-lived page access token; access in server-only code
- Recommendations: Implement token refresh mechanism if API supports it; add monitoring for token expiration

## Performance Bottlenecks

**Large Component State Management:**
- Problem: TransactionTabs combines sale/rent filtering with size unit toggle; re-renders entire table on unit change
- Files: `src/components/apt/TransactionTabs.tsx` (lines 37-62)
- Cause: All transaction filtering in single component; useMemo dependencies on all transactions
- Improvement path: Split into separate FilterControl and TransactionList components; memoize table rows

**Unnecessary Multiple Fetches in Dynamic Pages:**
- Problem: `src/app/apt/[region]/[slug]/page.tsx` fetches complex data twice: metadata + page render
- Files: `src/app/apt/[region]/[slug]/page.tsx` (lines 32-36, 66-73)
- Cause: generateMetadata runs separately; data not cached between calls
- Improvement path: Use fetch with shared cache key; implement server-side cache layer (e.g., Redis)

**Sequential API Calls with Fixed Delays:**
- Problem: Region data fetch uses sequential loop with 300ms delay between APIs
- Files: `src/lib/api/reb.ts` (lines 189-204)
- Cause: Rate limiting concern; but could be parallelized with retry backoff
- Improvement path: Use Promise.all with exponential backoff retry; implement proper rate limiter class

**Search Query Building Without Indexes:**
- Problem: Complex multi-condition SQL queries on apt_complexes table; no mention of index strategy
- Files: `src/app/search/page.tsx` (lines 85-150 approx)
- Cause: Composite searches on region_name, dong_name, apt_name
- Improvement path: Add composite indexes; consider full-text search (PostgreSQL tsvector)

## Fragile Areas

**XML Parsing in Multiple APIs:**
- Files: `src/lib/api/molit.ts`, `src/lib/api/molit-rent.ts`, `src/lib/api/molit-multi.ts`, `src/lib/api/reb.ts`, `src/lib/api/ecos.ts`
- Why fragile: Simple regex parsing with no schema validation; API field names assumed but not validated; silent failures return empty arrays
- Safe modification: Add dedicated XML parsing test suite; mock API responses for each field name variant
- Test coverage: No unit tests found for XML parsing; high risk of regression

**Cron Job Error Handling:**
- Files: `src/app/api/cron/fetch-transactions/route.ts` (lines 98-120+), other cron routes
- Why fragile: Long-running batch operations with try-catch at item level; errors don't stop batch; partial failures not reported
- Safe modification: Add structured error logging per batch; implement idempotent operation detection
- Test coverage: No test coverage visible for cron failure scenarios

**Database Query Builder Placeholder Management:**
- Files: `src/lib/db/client.ts` (lines 95-98, 550-574)
- Why fragile: Manual parameter index tracking; complex logic for UPDATE/DELETE with WHERE clauses
- Safe modification: Add dedicated tests for parameter alignment in all operation types
- Test coverage: No visible tests; risk of SQL syntax errors under edge cases

**Theme/Color System Reliance on CSS Variables:**
- Files: `src/components/apt/TransactionTabs.tsx` (lines 80, 86, 98-99)
- Why fragile: Components reference undefined CSS variables (e.g., `--color-text-tertiary`); no type-safe color system
- Safe modification: Define color tokens in TypeScript; create theme provider validation
- Test coverage: No visual regression tests

## Scaling Limits

**Database Connection Pool Size:**
- Current capacity: 10 connections (hardcoded in src/lib/db/client.ts line 17)
- Limit: At peak traffic with 10+ concurrent requests, queue backs up; Vercel max 60s timeout
- Scaling path: Make max connections configurable via env var; implement connection queue with timeout; consider read replicas for read-heavy queries

**Single Cron Job Timeout Window:**
- Current capacity: 300s max (Vercel Pro limit)
- Limit: Batch processing of 50+ regions × 3 months = high risk of timeout
- Scaling path: Split fetch-transactions into finer batch groups; implement resumable checkpoints (store processed state in DB)

**Cache Invalidation After Cron Updates:**
- Current capacity: Single SW cache version for all users
- Limit: Stale cache persists until manual version bump; no granular cache invalidation
- Scaling path: Implement versioned API endpoints; use On-Demand ISR for page revalidation; add ETag support

**Push Notification Queue:**
- Current capacity: Promise.allSettled() sends all notifications in parallel
- Limit: Large user base (100k+) would exceed Firebase Cloud Messaging rate limits
- Scaling path: Implement notification queue with rate limiting; batch sends; track subscription validity

## Dependencies at Risk

**Next.js 16.2.1:**
- Risk: Early version; potential stability issues; docs may not be finalized
- Impact: Breaking API changes between 16.x versions possible
- Migration plan: Lock to specific patch version; monitor Next.js releases closely; test minor upgrades in preview first

**Firebase 12.11.0 & firebase-admin 13.7.0:**
- Risk: Auth/database breaking changes in major versions; library size impact
- Impact: Token validation failures; session management bugs
- Migration plan: Keep versions aligned; review Firebase API deprecation notices quarterly

**Custom pg Client Without ORM:**
- Risk: Raw SQL with manual parameter tracking; no type safety for query results
- Impact: Type errors in large refactors; incorrect field access
- Migration plan: Adopt TypeScript-first query builder (like Kysely) or Prisma for type-safe queries

**Recharts 3.8.0:**
- Risk: Chart rendering performance degradation with large datasets; SVG-based (not canvas)
- Impact: Mobile devices may stutter on pages with 500+ data points
- Migration plan: Add virtualization for large charts; consider canvas alternative (Chart.js) for high-volume data

## Missing Critical Features

**Request Idempotency:**
- Problem: Cron jobs have no idempotency keys; duplicate API calls cause duplicate DB inserts if retry happens
- Blocks: Exactly-once data processing; reliable batch jobs
- Files: `src/app/api/cron/*` routes

**Data Validation Schema:**
- Problem: No runtime validation for API responses (ParsedTransaction, etc); TypeScript types only
- Blocks: Robust error handling; debugging API integration bugs
- Files: `src/lib/api/*.ts`

**Monitoring & Alerting:**
- Problem: No structured error tracking (Sentry, etc); only console.error
- Blocks: Production issue detection; trend analysis
- Files: `src/lib/logger.ts` (line 41)

**Rate Limiting:**
- Problem: No rate limit middleware on public APIs
- Blocks: DDoS protection; API quota enforcement
- Files: `src/app/api/apt/route.ts`, `src/app/api/search/route.ts`, etc.

## Test Coverage Gaps

**API Integration Tests:**
- What's not tested: XML parsing from actual MOLIT/REB/ECOS APIs; mock responses insufficient
- Files: `src/lib/api/*.ts`
- Risk: Silent data corruption if API changes field names or format
- Priority: High — affects data integrity

**Database Query Builder Edge Cases:**
- What's not tested: Complex UPDATE with WHERE + multiple conditions; DELETE with IN clause; parameter alignment
- Files: `src/lib/db/client.ts`
- Risk: Production SQL errors; data loss from wrong DELETE conditions
- Priority: High — critical component

**Service Worker Offline Scenarios:**
- What's not tested: Navigation fallback; concurrent requests during SW activation; resource cache invalidation
- Files: `public/sw.js`
- Risk: Users see 404 or stale pages; confusing offline UX
- Priority: Medium — affects UX quality

**Error Recovery in Batch Jobs:**
- What's not tested: Partial batch failure; timeout during long-running cron; connection pool exhaustion
- Files: `src/app/api/cron/*.ts`
- Risk: Incomplete data updates; inconsistent state
- Priority: High — data consistency impact

**Search Query Performance:**
- What's not tested: Query plans for complex searches; index effectiveness; slow queries under high cardinality
- Files: `src/app/search/page.tsx`
- Risk: Slow search response; poor user experience
- Priority: Medium — performance impact

---

*Concerns audit: 2026-03-27*
