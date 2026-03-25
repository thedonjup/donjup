# Coding Conventions

**Analysis Date:** 2026-03-26

## Naming Patterns

**Files:**
- Pages: `page.tsx` (Next.js App Router convention)
- Layouts: `layout.tsx`
- API routes: `route.ts`
- Components: PascalCase — `KakaoMap.tsx`, `RankingTabs.tsx`, `AuthProvider.tsx`
- Library modules: kebab-case — `region-codes.ts`, `rate-types.ts`, `molit-rent.ts`
- Utility modules: kebab-case single-word — `format.ts`, `calculator.ts`, `alert.ts`

**Functions:**
- camelCase for all functions: `formatPrice()`, `createClient()`, `sendSlackAlert()`
- React components: PascalCase — `ThemeProvider`, `MobileBottomSheet`, `FilterChip`
- Inline sub-components within pages use PascalCase: `Header()`, `Footer()`, `NavLink()`, `StatBarItem()`, `QuickLinkCard()`
- Hooks: `useTheme()`, `useAuth()` (standard React `use` prefix)

**Variables:**
- camelCase: `heroTx`, `sortedRates`, `filteredTransactions`
- Constants: UPPER_SNAKE_CASE — `RATE_LABELS`, `RATE_ORDER`, `BATCH_GROUPS`, `PROPERTY_TYPES`
- Config objects: UPPER_SNAKE_CASE — `DROP_LEVEL_CONFIG`, `SIDO_SEARCH_MAP`

**Types/Interfaces:**
- PascalCase: `Transaction`, `MapTransaction`, `AuthContextValue`, `DbClient`
- Inline prop types using object literals for simple components (no separate interface)
- Exported interfaces for shared data shapes

## Code Style

**Formatting:**
- No Prettier config detected — relies on ESLint + editor defaults
- Double quotes for strings (consistent across codebase)
- Semicolons: always used
- Trailing commas: used in multi-line constructs
- 2-space indentation

**Linting:**
- ESLint with `eslint-config-next` (core-web-vitals + TypeScript)
- Config at `eslint.config.mjs`
- Common ESLint disable: `/* eslint-disable @typescript-eslint/no-explicit-any */` used in several files
- Run: `pnpm lint`

## Import Organization

**Order (observed pattern):**
1. React/Next.js framework imports (`next/server`, `next/link`, `next/navigation`)
2. Third-party library imports (`firebase/auth`, `recharts`, `pg`)
3. Internal absolute imports using `@/` alias (`@/lib/...`, `@/components/...`)
4. Relative imports (rare — mostly within same directory)
5. Type-only imports: `import type { Metadata } from "next"`

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Use `@/lib/...` for utilities, `@/components/...` for components
- Never use relative paths like `../../lib/` — always use `@/`

**Examples:**
```typescript
// Framework first
import { NextResponse } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";

// Internal imports
import { createClient } from "@/lib/supabase/server";
import { formatPrice, RATE_LABELS } from "@/lib/format";
import RankingTabs from "@/components/home/RankingTabs";
```

## Component Patterns

**Server Components (default):**
- All `page.tsx` files are async server components by default
- Fetch data directly using `createClient()` from `@/lib/supabase/server`
- Use `export const revalidate = N` for ISR (e.g., `revalidate = 300` for homepage, `revalidate = 3600` for detail pages)
- Export `generateMetadata()` for dynamic SEO metadata
- Example: `src/app/page.tsx`, `src/app/apt/[region]/[slug]/page.tsx`

**Client Components:**
- Marked with `"use client"` directive at top of file
- Used for: interactivity (tabs, filters, maps), browser APIs (localStorage, Kakao SDK), auth state
- Located in `src/components/` directory
- Examples: `src/components/map/KakaoMap.tsx`, `src/components/home/RankingTabs.tsx`, `src/components/providers/ThemeProvider.tsx`

**Provider Pattern:**
- Context providers wrap the app in `src/app/layout.tsx`
- Nesting order: `ThemeProvider` > `AuthProvider` > children
- Each provider exports both the provider component (default export) and a hook (named export)
- Pattern in `src/components/providers/AuthProvider.tsx`:
  ```typescript
  const AuthContext = createContext<AuthContextValue>({...});
  export function useAuth() { return useContext(AuthContext); }
  export default function AuthProvider({ children }) { ... }
  ```

**Inline Sub-Components:**
- Small presentational components are defined as regular functions in the same file
- Not exported — used only within the parent component
- Example: `StatBarItem()`, `QuickLinkCard()`, `FilterChip()` in `src/app/page.tsx`
- Props typed inline: `{ label: string; value: number; suffix: string; accent: string }`

**Component Composition:**
- Wrapper components for client/server boundary: `PriceHistoryChartWrapper.tsx` wraps `PriceHistoryChart.tsx`
- Skeleton components in `src/components/skeleton/` for loading states

## Error Handling

**API Routes:**
- Try/catch at the top level of handler functions
- Return `NextResponse.json({ error: error.message }, { status: 500 })` on failure
- Log errors with context prefix: `console.error("[Search API] Query failed:", e.message)`
- Cron routes authenticate via `Authorization: Bearer ${CRON_SECRET}` header

**Server Components (pages):**
- Wrap data fetching in try/catch, fall back to empty arrays on failure
- Use `Promise.allSettled()` for parallel queries, check `.status === "fulfilled"`
- Pattern from `src/app/page.tsx`:
  ```typescript
  try {
    const [dropsRes, highsRes, ...] = await Promise.allSettled([...]);
    drops = dropsRes.status === "fulfilled" ? dropsRes.value.data ?? [] : [];
  } catch (e) {
    console.error("[Homepage] DB query failed:", e instanceof Error ? e.message : e);
  }
  ```

**Database Layer:**
- `src/lib/db/client.ts` QueryBuilder returns `{ data, error }` shaped like Supabase responses
- Errors enriched with SQL and params in dev mode
- Connection pool auto-recreates on error (`pool = null` in error handler)

**Alerts:**
- `src/lib/alert.ts` — `sendSlackAlert()` for critical cron job notifications
- Silently fails if webhook URL not configured (`.catch(() => {})`)

## Styling Approach

**Primary: Tailwind CSS v4 + CSS Custom Properties**
- Tailwind v4 via `@tailwindcss/postcss` plugin
- PostCSS config: `postcss.config.mjs`
- Global styles: `src/app/globals.css` (378 lines)

**Theming System (Dark Mode):**
- CSS custom properties for all colors: `--color-surface-page`, `--color-text-primary`, etc.
- Theme toggled via `data-theme="dark"` attribute on `<html>`
- Theme persisted in `localStorage` key `donjup-theme`
- Custom utility classes for theme-aware colors:
  - `.t-text` → `color: var(--color-text-primary)`
  - `.t-card` → `background: var(--color-surface-card)`
  - `.t-drop` → `color: var(--color-semantic-drop)`
  - `.t-rise` → `color: var(--color-semantic-rise)`
  - `.t-border` → `border-color: var(--color-border)`

**Brand Colors:**
- Brand: emerald/green palette (`--color-brand-50` through `--color-brand-900`)
- Semantic: drop=red (`#ef4444`), rise=green (`#10b981`), warn=amber (`#f59e0b`)
- Gold accent: `--color-gold-*`

**Inline Styles:**
- Used for dynamic theme-aware styling where Tailwind classes are insufficient
- Pattern: `style={{ color: "var(--color-text-secondary)" }}`
- Common in map components and complex UI elements

**Font:**
- Pretendard Variable (Korean web font) loaded via CDN in `globals.css`
- Fallback chain: system fonts including "Apple SD Gothic Neo", "Noto Sans KR"

**No CSS Modules or styled-components** — all styling is Tailwind utilities + CSS custom properties + inline styles.

## TypeScript Usage

**Strict Mode:** Enabled in `tsconfig.json`

**Type Patterns:**
- Interfaces for data shapes: `interface Transaction { ... }`
- `type` for unions and simple aliases: `type Theme = "light" | "dark"`, `type TabKey = "drops" | "highs" | ...`
- `Record<string, string>` for maps/dictionaries
- Inline prop types for single-use components
- `any` used liberally in database layer (with eslint-disable) — the QueryBuilder and several API routes use `any`

**Common Patterns:**
- `Promise<{ [key: string]: string | string[] | undefined }>` for `searchParams` (Next.js 16 async params)
- `Readonly<{ children: React.ReactNode }>` for layout props
- Non-null assertion `!` used on known-present values: `heroTx.change_rate!`
- Type casting: `(drops as Transaction[])` for data from Supabase

## API Route Patterns

**Structure:**
- All routes export named HTTP method handlers: `export async function GET(request: Request)`
- Use `NextResponse.json()` for responses
- Parse query params from `new URL(request.url).searchParams`

**Cron Routes (in `src/app/api/cron/`):**
- Authenticate via `Authorization: Bearer ${CRON_SECRET}`
- Set `export const maxDuration = 300` for long-running jobs
- Scheduled via Vercel Cron in `vercel.json`
- Use batch parameters for parallel execution: `?batch=0`, `?batch=1`, etc.
- Pattern:
  ```typescript
  export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ... business logic
  }
  ```

**Data Access in Routes:**
- Server-side: `createServiceClient()` from `@/lib/supabase/server` (sync, returns `DbClient`)
- Some routes use `getPool()` directly from `@/lib/db/client` for raw SQL
- The Supabase client is actually a custom `DbClient` wrapping `pg` Pool with a Supabase-compatible query builder API

**Response Format:**
- Success: `NextResponse.json({ data, pagination? })`
- Error: `NextResponse.json({ error: message }, { status: code })`
- Pagination: `{ page, limit, total, totalPages }`

## SEO Patterns

**Metadata:**
- Root layout exports `metadata` and `viewport` objects
- Dynamic pages export `generateMetadata()` async function
- Title template: `%s | 돈줍` (set in root layout)
- OpenGraph images configured for each section

**Structured Data:**
- JSON-LD components in `src/components/seo/JsonLd.tsx`
- Reusable: `JsonLd`, `BreadcrumbJsonLd`, `FaqJsonLd`, `ItemListJsonLd`
- Inline `<script type="application/ld+json">` in page components

**ISR (Incremental Static Regeneration):**
- `export const revalidate = 300` (5 min) for high-traffic pages
- `export const revalidate = 3600` (1 hr) for detail pages

## Comments

**When to Comment:**
- Section dividers in large page files: `{/* ============ */}` blocks
- Korean comments for business logic explanation
- JSDoc only on utility functions: `/** 만원 단위 가격을 한글 표기로 변환 */`
- No excessive documentation — code is mostly self-documenting

**ESLint Disables:**
- `/* eslint-disable @typescript-eslint/no-explicit-any */` at file level for DB-heavy files

## Module Design

**Exports:**
- Components: default export for the main component, named exports for hooks/utilities
- Lib modules: named exports only — `export function formatPrice()`, `export const RATE_LABELS`
- No barrel files (`index.ts`) — import directly from the module file

**Database Access Pattern:**
- `src/lib/supabase/server.ts` — `createClient()` (async) and `createServiceClient()` (sync), both return `DbClient`
- `src/lib/supabase/client.ts` — throws error, enforcing server-only DB access
- `src/lib/db/client.ts` — actual `pg` Pool + custom QueryBuilder mimicking Supabase PostgREST API
- Pattern: code written to Supabase API shape, but backed by raw PostgreSQL via `pg`

---

*Convention analysis: 2026-03-26*
