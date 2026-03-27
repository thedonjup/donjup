# Testing Patterns

**Analysis Date:** 2026-03-27

## Test Framework

**Status:** Not detected

**Current State:**
- No test runner (Jest, Vitest, etc.) configured
- No test files in `src/` directory (`.test.ts`, `.spec.ts` patterns absent)
- No test configuration files (`jest.config.*`, `vitest.config.*`) present
- No testing libraries as dev dependencies (`@testing-library/*`, `jest`, `vitest`)

**Type Checking Only:**
- TypeScript strict mode (`strict: true`) used for compile-time verification
- ESLint with Next.js rules enforces code quality
- Build-time type checking catches many errors

## Codebase Testing Approach

**Current Pattern:**
All testing appears to be manual or handled at runtime rather than through unit/integration tests.

**Quality Assurance Mechanisms:**
1. **Type Safety:** Strict TypeScript with full type annotations prevents runtime type errors
2. **ESLint:** Core-web-vitals and TypeScript rules catch common issues
3. **Manual Testing:** Likely done in development environment and staging/production
4. **API Testing:** Cron jobs and API endpoints have logging that indicates testing during deployment (`logger.error`, `logger.info`)

## Test-Like Code Patterns

**Validation Functions:**
- Input validation at API route level (e.g., query parameter parsing with `parseInt()` and defaults)
- Data type assertions: `const complexes: AptComplex[] = (data ?? []) as AptComplex[]`
- Null coalescing and optional chaining used to prevent runtime errors

**Error Boundaries:**
- Try-catch at system boundaries (Firebase, external APIs)
- Explicit error handling in route handlers with logging
- Example from `src/components/ads/AdSlot.tsx`:
  ```typescript
  try {
    // ad slot initialization
  } catch {
    // silent failure
  }
  ```

## Logging as Testing Output

**Pattern:**
Logging is used to verify behavior in production/staging:

- `logger.error()` called when operations fail with context
- API routes log success/failure metrics (total inserted, new highs, drops)
- Analytics functions log with try-catch for non-critical operations

Example from fetch-transactions route:
```typescript
logger.error("Failed to fetch...", { error, route: "/api/apt" });
```

## Recommendations for Adding Tests

**Framework Suggestion:**
- Vitest: Lighter than Jest, works with Next.js, minimal config
- Or Jest with `@testing-library/react` for component testing

**High-Priority Areas to Test:**
1. **Utility Functions** (`src/lib/`):
   - `formatPrice()` and `formatKrw()` - currency formatting edge cases
   - `calcEqualPayment()` - loan calculation correctness
   - `sqmToPyeong()` - area conversion accuracy

2. **Type/Data Validation:**
   - UUID validation pattern in `src/app/api/apt/[id]/route.ts`
   - Region code lookups in cron jobs

3. **Critical API Routes:**
   - `/api/apt/` and `/api/apt/[id]/` - base queries
   - `/api/cron/fetch-transactions` - complex batch logic
   - `/api/cron/validate-data` - data integrity checks

4. **Component Integration:**
   - `AptDetailClient.tsx` - complex state management with context
   - `TransactionTabs.tsx` - filtering and unit conversion logic

**Test File Organization (if implemented):**
```
src/
├── lib/
│   ├── format.ts
│   ├── format.test.ts          # Unit tests
│   ├── calculator.ts
│   └── calculator.test.ts
├── components/
│   ├── apt/
│   │   ├── AptDetailClient.tsx
│   │   └── AptDetailClient.test.tsx
└── app/
    └── api/
        └── apt/
            ├── route.ts
            └── route.test.ts
```

**Missing Test Infrastructure:**
- No test data fixtures or factories
- No mock definitions for database/Firebase
- No test utilities or helpers
- No CI/CD integration for test runs

---

*Testing analysis: 2026-03-27*
