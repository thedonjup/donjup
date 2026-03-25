# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Runner:** Not configured

No test framework is installed or configured. The project has:
- No `jest.config.*` or `vitest.config.*` files
- No test runner in `package.json` dependencies (no jest, vitest, mocha, etc.)
- No `test` script in `package.json` scripts
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files anywhere in the codebase
- No `__tests__` directories

## Test File Organization

**Location:** No test files exist.

**If tests were to be added, follow these conventions based on the codebase structure:**

**Recommended co-location pattern:**
```
src/
  lib/
    format.ts
    format.test.ts         # Unit tests for utilities
  components/
    home/
      RankingTabs.tsx
      RankingTabs.test.tsx  # Component tests
  app/
    api/
      search/
        route.ts
        route.test.ts       # API route tests
```

## Run Commands

```bash
# No test commands configured
# package.json only has: dev, build, start, lint
```

## Mocking

**Framework:** Not applicable (no tests)

**What would need mocking if tests are added:**
- `@/lib/db/client` — the `pg` Pool and `QueryBuilder` class
- `@/lib/supabase/server` — `createClient()` / `createServiceClient()`
- `firebase/auth` — Firebase authentication (used in `AuthProvider`)
- External APIs: MOLIT (`src/lib/api/molit.ts`), ECOS (`src/lib/api/ecos.ts`), Naver News, etc.
- `fetch` — used extensively in cron routes and external API calls
- `process.env` — environment variables for API keys, CRON_SECRET, etc.

## Coverage

**Requirements:** None enforced

**No coverage tooling configured.**

## Test Types

**Unit Tests:** Not present
- High-value targets for unit tests:
  - `src/lib/format.ts` — `formatPrice()`, `formatKrw()`, `sqmToPyeong()` (pure functions)
  - `src/lib/calculator.ts` — loan calculation logic
  - `src/lib/db/client.ts` — QueryBuilder SQL generation
  - `src/lib/constants/region-codes.ts` — region code mappings

**Integration Tests:** Not present
- High-value targets:
  - API routes in `src/app/api/` — search, apt queries, rate endpoints
  - Cron job handlers in `src/app/api/cron/` — data fetching and processing

**E2E Tests:** Not present
- No Playwright, Cypress, or similar framework installed

## CI/CD Test Pipeline

**No CI test pipeline configured.**

- No `.github/workflows/` directory
- Deployment is via Vercel CLI: `npx vercel --prod --yes`
- Vercel runs `next build` on deploy (type-checking + compilation), which provides build-time validation
- Linting runs via `pnpm lint` but is not enforced in CI

## Quality Assurance

**Current safeguards (in lieu of tests):**
1. TypeScript strict mode catches type errors at build time
2. ESLint with Next.js core-web-vitals rules catches common issues
3. `next build` validates all server/client component boundaries
4. Vercel preview deployments for manual verification
5. Cron route authentication via `CRON_SECRET` header check

**Recommended test framework if adding tests:**
- **Vitest** — recommended for Next.js projects (fast, ESM-native, compatible with React Testing Library)
- Configuration would go in `vitest.config.ts` at project root
- Use `@testing-library/react` for component tests
- Use `msw` (Mock Service Worker) for API mocking

## Priority Test Targets

If tests are to be introduced, prioritize in this order:

1. **Pure utility functions** (easiest, highest ROI):
   - `src/lib/format.ts` — price formatting, size conversion
   - `src/lib/calculator.ts` — loan calculations
   - `src/lib/constants/region-codes.ts` — data integrity

2. **Database query builder** (complex, critical):
   - `src/lib/db/client.ts` — SQL generation, parameter binding, edge cases

3. **API routes** (integration-level):
   - `src/app/api/search/route.ts` — search with filters
   - `src/app/api/apt/route.ts` — pagination logic
   - `src/app/api/rate/calculate/route.ts` — calculation endpoints

4. **Cron jobs** (high-impact):
   - `src/app/api/cron/fetch-transactions/route.ts` — data ingestion
   - `src/app/api/cron/refresh-cache/route.ts` — cache invalidation

---

*Testing analysis: 2026-03-26*
