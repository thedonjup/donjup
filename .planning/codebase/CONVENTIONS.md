# Coding Conventions

**Analysis Date:** 2026-03-27

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension, e.g., `AptDetailClient.tsx`, `TransactionTabs.tsx`
- Utility/library modules: kebab-case with `.ts` extension, e.g., `molit-multi.ts`, `calc-utils.ts`
- API route files: `route.ts` in directory-based structure following Next.js App Router pattern
- Type definition files: any `.ts` or `.tsx` file containing interfaces/types

**Functions:**
- Exported functions: camelCase, e.g., `createServiceClient()`, `formatPrice()`, `calcEqualPayment()`
- Private/internal functions: camelCase with underscore prefix uncommon (use closure/module scope instead), e.g., `log()`, `buildScheduleEqualPayment()`
- React component functions: PascalCase (same as file name), e.g., `AptDetailClient()`, `TransactionTabs()`
- Hook functions: camelCase with `use` prefix, e.g., `useSizeUnit()`, `useAuth()`

**Variables:**
- Local variables: camelCase, e.g., `selectedSize`, `monthlyPayment`, `isCronBatch`
- Constants (module-level): UPPER_SNAKE_CASE, e.g., `LOW_FLOOR_MAX`, `GRAPH_API`, `BATCH_GROUPS`
- Component props interfaces: PascalCase + `Props` suffix, e.g., `AdSlotProps`, `SearchTrackerProps`
- Context/state variables: camelCase, e.g., `sizeUnit`, `tab`, `selectedSize`

**Types:**
- Interfaces: PascalCase, e.g., `AptComplex`, `AptTransaction`, `LoanInput`, `SizeUnitContextType`
- Union/conditional types: PascalCase, e.g., `DropLevel = "normal" | "decline" | "crash" | "severe"`
- Type aliases: PascalCase, e.g., `type PropertyType = 1 | 2 | 3`
- Props interfaces: ComponentName + `Props`, e.g., `AdSlotProps`, `SearchTrackerProps`, `ViewDetailTrackerProps`

## Code Style

**Formatting:**
- No explicit formatter configured (not using Prettier or Biome)
- Manual enforcement via ESLint rules
- Indentation: 2 spaces (inferred from actual code)
- Line length: No hard limit observed
- Semicolons: Always used

**Linting:**
- Tool: ESLint 9 with Next.js configuration
- Config file: `eslint.config.mjs` (flat config format)
- Applied rulesets:
  - `eslint-config-next/core-web-vitals`: Web Vitals best practices
  - `eslint-config-next/typescript`: TypeScript-specific rules
- Custom ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

**TypeScript:**
- Version: 5.x
- `strict: true` enabled (strictest type checking)
- `noEmit: true` (type checking only, no runtime compilation)
- Path aliases: `@/*` → `./src/*`
- Target: ES2017

## Import Organization

**Order:**
1. React and framework imports (`import React`, `import { useState }`, `import { NextResponse }`)
2. Internal library imports (`import { createServiceClient }`, `import { logger }`)
3. Component imports (`import AptDetailClient`, `import TransactionTabs`)
4. Type imports (`import type { AptComplex }`, `import type { AptTransaction }`)

**Path Aliases:**
- Consistent use of `@/` prefix for all imports from `src/`
- Example: `@/lib/db/server`, `@/components/apt/AptDetailClient`, `@/types/db`
- Never use relative paths like `../` or `../../` in actual codebase (always use `@/`)

**Barrel Files:**
- Not systematically used; direct imports from specific modules preferred
- Example: `import { createServiceClient } from "@/lib/db/server"` not `import { createServiceClient } from "@/lib/db"`

## Error Handling

**Patterns:**
- Explicit error checking in API routes: verify `error` field from database queries
  ```typescript
  const { data, error } = await query;
  if (error) {
    logger.error("Failed to fetch...", { error, route: "/api/apt" });
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
  ```
- Throw errors for external APIs with context
  ```typescript
  if (!accessToken || !userId) {
    throw new Error("Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID environment variable");
  }
  ```
- Try-catch at system boundaries (Firebase reads, analytics)
  ```typescript
  try {
    // operation
  } catch {
    // silent failure or fallback
  }
  ```
- Client-side: Try-catch blocks in effect hooks or event handlers for DOM/browser APIs

## Logging

**Framework:** Custom `logger` module at `@/lib/logger.ts`

**Patterns:**
- Four log levels available: `debug`, `info`, `warn`, `error`
- Usage: `logger.error(message, context)` where context is optional Record
- Development: Output to console with color-coded level
- Production: Output as JSON to stdout for structured logging
- Error objects automatically formatted and nested under `error` key
- Example:
  ```typescript
  logger.error("Failed to fetch apt complexes", { error, route: "/api/apt" });
  ```

## Comments

**When to Comment:**
- JSDoc comments for exported functions/modules that need explanation of purpose and environment variables
- Inline comments (using `//`) for non-obvious logic, especially in:
  - Mathematical calculations (e.g., area conversion ratios)
  - Data transformation logic
  - Batch processing or loop logic
- Comments in Korean (same as codebase language)

**JSDoc/TSDoc:**
- Block comments only for module-level or public function documentation
- Example from `instagram/client.ts`:
  ```typescript
  /**
   * Instagram Graph API client for publishing photos and carousels.
   *
   * Required environment variables:
   *   INSTAGRAM_ACCESS_TOKEN  – Long-lived page access token
   *   INSTAGRAM_USER_ID       – Instagram Business Account ID
   */
  ```
- Parameter/return documentation uncommon (rely on TypeScript types instead)
- No automatic doc generation tool in use

## Function Design

**Size:**
- Small functions preferred; most utility functions 10-40 lines
- Larger functions (100+ lines) used for route handlers with multiple sequential operations
- Complex operations broken into smaller private functions, e.g., `buildScheduleEqualPayment()` helper for loan calculation

**Parameters:**
- Prefer object parameters for functions with >2 arguments
- Example: `calcEqualPayment({ principal, rate, years })`
- Type parameters always annotated, even for simple cases
- Destructuring in function signature common for React components

**Return Values:**
- Explicit return types always specified in function declarations
- No implicit `any` returns
- API routes always return `NextResponse.json()` with typed data
- Utility functions may return `void` for logging operations

## Module Design

**Exports:**
- Named exports preferred for utilities, functions, and types
- Default export for React components (one per file)
- Mix of named and default exports in some files (e.g., `AptDetailClient.tsx` exports hook + interface + component)
- Example:
  ```typescript
  // utilities
  export function formatPrice(priceInManWon: number): string { ... }
  export const RATE_LABELS: Record<string, string> = { ... }

  // components
  export default function AptDetailClient({ ... }) { ... }
  export function useSizeUnit() { ... }
  ```

**Module Scope:**
- Heavy use of closure and module-level private state
- Constants defined at module top (e.g., `BATCH_GROUPS`, `DROP_LEVEL_CONFIG`)
- Helper functions defined after exports in logical order
- Related utilities grouped in same file (e.g., `format.ts` contains `formatPrice`, `formatKrw`, `sqmToPyeong`, and constants)

---

*Convention analysis: 2026-03-27*
