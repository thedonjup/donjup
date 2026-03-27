# Codebase Structure

**Analysis Date:** 2026-03-27

## Directory Layout

```
donjup/
├── src/                          # Source code (TypeScript)
│   ├── app/                      # Next.js App Router (pages, routes, layouts)
│   ├── components/               # Reusable React components
│   ├── lib/                      # Shared business logic, utilities, integrations
│   └── types/                    # Centralized TypeScript interfaces
├── public/                       # Static assets (favicons, manifest, robots.txt)
├── .planning/                    # GSD phase planning and analysis
├── next.config.ts                # Next.js configuration (CSP, cache headers)
├── tsconfig.json                 # TypeScript compiler settings
├── package.json                  # Node.js dependencies and scripts
├── pnpm-lock.yaml               # Dependency lock file (pnpm package manager)
└── [config files]               # ESLint, PostCSS, Tailwind, environment
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router file structure (routes, pages, API endpoints)
- Structure: File-based routing — `[route]/page.tsx` = HTTP route, `[id]/layout.tsx` = nested layout
- Contains:
  - `page.tsx` — Page component (renders at route)
  - `layout.tsx` — Shared layout for route and children
  - `error.tsx` — Error boundary (caught via React Error Boundary)
  - `route.ts` — API endpoint handler (GET, POST, PUT, DELETE)
  - `globals.css` — Global styles (Tailwind @apply, custom properties)
- Key subdirectories:
  - `app/` — Root layout and homepage
  - `app/api/` — All API endpoints (RESTful routes)
  - `app/apt/[id]/` — Apartment detail page with dynamic ID
  - `app/today/` — Daily transaction listing
  - `app/market/[sido]/[sigungu]/` — Region-specific market data
  - `app/rate/` — Interest rates dashboard
  - `app/search/` — Search page
  - `app/profile/` — User profile (protected route)
  - `app/dam/` — Admin dashboard (DAM = 돈줍 Admin Manager)

**src/components/**
- Purpose: Reusable, composable React components
- Structure: Feature-based subdirectories, each containing related components
- Contains: Both server components (fetch-wrapper) and client components ("use client")
- Key subdirectories:
  - `components/apt/` — Apartment detail views (AptDetailClient, TransactionTabs, FavoriteButton)
  - `components/charts/` — Data visualization (Recharts wrappers — price history, mini charts)
  - `components/home/` — Homepage sections (HeroSection, RankingTabs, StatsBar, RateBar)
  - `components/layout/` — Global layout (Header, Footer, MobileNav, BackToTop)
  - `components/auth/` — Authentication UI (LoginModal, UserMenu, FavoriteButton with auth check)
  - `components/map/` — Kakao Maps integration (KakaoMap, MobileBottomSheet)
  - `components/search/` — Search UI and logic (SearchTracker, SearchForm)
  - `components/providers/` — React Context providers (ThemeProvider, AuthProvider)
  - `components/analytics/` — Tracking and telemetry (ViewDetailTracker, UTMTracker, SearchTracker)
  - `components/ads/` — Advertisement slots (AdSlot, InfeedAd)
  - `components/onboarding/` — First-time user flow
  - `components/skeleton/` — Loading placeholders
  - `components/seo/` — SEO helpers (JsonLd, metadata)

**src/lib/**
- Purpose: Business logic, utilities, external integrations, database access
- Structure: Feature/domain-based subdirectories + standalone utility files
- Key subdirectories and files:
  - `lib/db/` — Database layer
    - `client.ts` — QueryBuilder class, connection pool initialization, parameterized SQL builder
    - `server.ts` — Service client factory (thin wrapper)
    - `rent-client.ts` — Alternative client for rental market data
  - `lib/api/` — External API wrappers
    - `molit.ts` — Official transaction data (MOLiT API), XML parsing, calculation of `change_rate`, `is_new_high`
    - `molit-multi.ts` — Bulk transaction fetch with multi-API support
    - `kakao.ts` — Geocoding (address ↔ coordinates), reverse geocoding
    - `[others]` — Bank rates, Instagram Graph API, Coupang Affiliate API
  - `lib/analytics/` — Page view and event tracking
  - `lib/firebase/` — Firebase SDK initialization and auth helpers
  - `lib/cardnews/` — Card news/social media content generation
    - `templates/` — Template strings for different content types
  - `lib/admin/` — Admin utilities and role checks
  - `lib/constants/` — Application constants
    - `region-codes.ts` — Hierarchical region structure (시/도 → 시군구 → 읍면동)
    - `property-types.ts` — Property type enum and labels (1=apt, 2=villa, 3=townhouse, etc.)
  - `lib/instagram/` — Instagram post scheduling and publishing
  - `logger.ts` — Structured logging (JSON in prod, pretty-print in dev)
  - `format.ts` — Display formatting (currency, area sqm↔pyeong, date)
  - `calculator.ts` — Financial calculations (loan simulator, mortgage payoff)
  - `kakao-share.ts` — Kakao Share Button SDK wrapper
  - `alert.ts` — Slack webhook for error notifications

**src/types/**
- Purpose: Centralized TypeScript type definitions
- Contains:
  - `db.ts` — Database entity interfaces (AptComplex, AptTransaction, FinanceRate, PageView, etc.)
  - `api.ts` — API request/response types
  - `kakao.d.ts` — Kakao SDK type declarations (augmenting `window` object)

**src/app/api/**
- Purpose: RESTful and RPC endpoints
- Structure: Nested routes matching URL paths
- Key routes:
  - `api/apt/` → GET list apartments with filters/pagination
  - `api/apt/[id]/` → GET apartment detail
  - `api/apt/extremes/` → GET price highs/lows for ranking
  - `api/cron/fetch-transactions/` → POST/GET triggered cron job
  - `api/cron/fetch-rates/` → GET latest mortgage rates
  - `api/cron/generate-cardnews/` → POST generate social media content
  - `api/cron/analytics/` → POST update page view cache
  - `api/analytics/pageview/` → POST log page view
  - `api/admin/users/` → GET admin user list (protected)
  - `api/bank-rates/` → GET current rates
  - `api/coupang/products/` → GET product recommendations

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx` — Root layout (providers, header, footer, analytics setup, service worker registration)
- `src/app/page.tsx` — Homepage (homepage_cache aggregation, ranking tabs)
- `src/app/api/[feature]/route.ts` — API endpoint handlers

**Configuration:**
- `next.config.ts` — Cache headers, CSP security policy, serverExternalPackages for pg
- `tsconfig.json` — Path aliases (`@/` → `src/`), strict mode
- `postcss.config.mjs` — Tailwind CSS integration
- `tailwind.config.ts` — Custom theme colors (brand-600, t-text, etc.)
- `.env.local`, `.env.vercel` — Environment variables (DATABASE_URL, API keys)

**Core Logic:**
- `src/lib/db/client.ts` — QueryBuilder (SQL builder, connection pooling)
- `src/lib/api/molit.ts` — Official transaction data fetching and parsing
- `src/lib/calculator.ts` — Loan payment calculations
- `src/lib/format.ts` — Display formatting utilities
- `src/components/providers/AuthProvider.tsx` — Firebase authentication context

**Testing:**
- No `__tests__` or `.test.ts` files found (testing framework not present)

**Special Directories:**
- `.planning/` — GSD phase documents and context (created by orchestrator)
- `public/` — Static files served at root (favicon.svg, manifest.json, robots.txt, sw.js)
- `.netlify/` — Netlify build artifacts (generated)
- `.vercel/` — Vercel build artifacts (gitignored)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (not `index.tsx`)
- Layouts: `layout.tsx`
- API handlers: `route.ts` (GET, POST, etc. exported as functions)
- Components: PascalCase with `.tsx` extension (e.g., `AptDetailClient.tsx`)
- Utils/lib: camelCase (e.g., `format.ts`, `logger.ts`)
- Type files: `db.ts`, `api.ts` (not `index.ts`)

**Directories:**
- Feature-based (e.g., `components/apt/`, `components/charts/`)
- Kebab-case for multi-word (e.g., `src/app/new-highs/`)
- Dynamic routes in brackets (e.g., `[id]/`, `[sido]/[sigungu]/`)

**React Components:**
- Function components: PascalCase (e.g., `HeroSection`, `AptDetailClient`)
- Context/hooks: `create*` for context factories, `use*` for hooks (e.g., `AuthProvider`, `useAuth`, `useSizeUnit`)
- Props interfaces: Component name + "Props" suffix (e.g., `AptDetailClientProps`)

**Functions/Variables:**
- camelCase (e.g., `createClient()`, `getPool()`, `sqmToPyeong()`)
- Constants: UPPER_SNAKE_CASE (e.g., `BATCH_GROUPS`, `LOW_FLOOR_MAX`)

## Where to Add New Code

**New Feature (Page + API + Business Logic):**
1. **Page component:** `src/app/[feature]/page.tsx`
   - Import `createClient()` for SSR data fetching
   - Use `async` to call database queries
   - Export `metadata` for SEO
   - Set `revalidate = 300` for ISR caching
2. **Client interactivity:** `src/components/[feature]/[ComponentName].tsx`
   - Start with `"use client"` directive
   - Use Context or state for client-side state
3. **API endpoint:** `src/app/api/[feature]/route.ts`
   - Define `export async function GET(request)` for GET requests
   - Validate `request.headers`, `searchParams`, request body
   - Return `NextResponse.json(...)`
4. **Business logic:** `src/lib/[feature]/[logic].ts`
   - Export pure functions or classes
   - Handle external API calls, data transformation
   - Use try-catch with proper error logging

**New Component/Module:**
- If displaying data: `src/components/[feature]/[ComponentName].tsx`
- If pure logic: `src/lib/[feature]/[utility].ts`
- If external API: `src/lib/api/[service].ts`
- Organize by feature, not by function type (prefer `components/apt/` over `components/UI/Apt/`)

**Utilities:**
- General utilities (formatting, math): `src/lib/[name].ts`
- Feature-specific utilities: `src/lib/[feature]/[utility].ts`
- Constants: `src/lib/constants/[domain].ts`
- Shared types: `src/types/[domain].ts`

## Special Files Explained

**src/app/layout.tsx**
- Root HTML structure (`<html>`, `<body>`)
- Wraps entire app with providers (ThemeProvider, AuthProvider)
- Loads external scripts (Google Analytics, Kakao Maps SDK, Adsense)
- Registers service worker for offline caching
- Sets global metadata (viewport, manifest, icons)

**src/app/error.tsx**
- React Error Boundary — catches errors in child components
- Shows user-friendly error message with "retry" button
- Component-level error handling (not API-level)

**src/app/global-error.tsx**
- Error boundary for root layout itself (catches errors in layout.tsx)
- More minimal fallback than error.tsx

**src/lib/db/client.ts**
- Custom QueryBuilder class (not using Supabase SDK)
- Mimics PostgREST API: `.select()`, `.eq()`, `.order()`, `.limit()`
- Builds parameterized SQL to prevent injection
- Lazy-initializes PostgreSQL connection pool on first `getPool()` call

**next.config.ts**
- Configures `Cache-Control` headers to prevent stale HTML after deploy
- Sets up CSP (Content Security Policy) for security
- Marks `pg` as serverExternalPackage (no bundling in serverless)

## File Examples

**Typical Page Component:**
- `src/app/today/page.tsx` — Fetches transactions, renders list, supports filters
- Server component by default (no "use client")
- Calls `createClient()` → queryBuilder chains → returns data to component
- Client component (PropertyTypeFilter) handles user filter selections

**Typical API Route:**
- `src/app/api/apt/route.ts` — GET handler with region/page filtering
- Validates query params, calls database, returns paginated JSON
- Includes error handling and logging

**Typical Client Component:**
- `src/components/apt/AptDetailClient.tsx` — Manages local state (sizeUnit, selectedSize)
- Provides context to child components via `SizeUnitContext`
- Renders tabs, charts, transaction lists (server-fetched, client-filtered)

**Typical Cron Job:**
- `src/app/api/cron/fetch-transactions/route.ts` — Scheduled data import
- Validates `CRON_SECRET`, fetches from MOLiT API in batches
- Upserts to `apt_transactions`, updates `homepage_cache`
- Alerts on error via Slack

---

*Structure analysis: 2026-03-27*
