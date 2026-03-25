# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Next.js 16 App Router monolith with server-side rendering, cron-based data pipeline, and CockroachDB (via custom Supabase-compatible query builder)

**Key Characteristics:**
- Server Components as default rendering strategy; client components only for interactivity (auth, theme, charts, maps)
- Custom `QueryBuilder` in `src/lib/db/client.ts` that mimics the Supabase PostgREST API but executes raw SQL against a `pg` Pool (CockroachDB)
- Scheduled cron jobs (Vercel Cron) fetch data from government APIs, process it, and store in CockroachDB
- Firebase Auth for user authentication (Google sign-in); Firestore for client-side features (comments, favorites)
- ISR (Incremental Static Regeneration) via `revalidate` exports on page components
- No separate backend service; all API logic lives in Next.js API routes

## Layers

**Presentation Layer (Pages + Components):**
- Purpose: Render UI using React Server Components and Client Components
- Location: `src/app/` (pages), `src/components/` (shared components)
- Contains: Page routes, layouts, loading states, error boundaries, opengraph images
- Depends on: `src/lib/supabase/server.ts` for data, `src/lib/format.ts` for formatting
- Used by: End users via browser

**API Layer (Route Handlers):**
- Purpose: Serve JSON data for client components and external integrations
- Location: `src/app/api/`
- Contains: REST endpoints for apt data, search, rates, analytics, push notifications
- Depends on: `src/lib/db/client.ts`, `src/lib/supabase/server.ts`
- Used by: Client components (fetch), Vercel Cron scheduler

**Cron/Pipeline Layer:**
- Purpose: Scheduled data ingestion from external government APIs
- Location: `src/app/api/cron/`
- Contains: 17 cron route handlers for fetching transactions, rates, rents, geocoding, report generation, social media posting
- Depends on: `src/lib/api/` (external API wrappers), `src/lib/db/client.ts`
- Used by: Vercel Cron scheduler (configured in `vercel.json`)

**Data Access Layer:**
- Purpose: Abstract database access with a Supabase-compatible query builder API
- Location: `src/lib/db/client.ts` (core), `src/lib/supabase/server.ts` (server wrapper), `src/lib/supabase/client.ts` (browser stub)
- Contains: `QueryBuilder` class, `RpcCaller`, `StorageApi` stub, connection pool management
- Depends on: `pg` package, `DATABASE_URL` env var
- Used by: All server-side code (pages, API routes, cron jobs)

**External API Wrappers:**
- Purpose: Fetch and parse data from Korean government and financial APIs
- Location: `src/lib/api/`
- Contains: MOLIT (apartment trades), ECOS (interest rates), building ledger, Naver news, REB index, Coupang, Instagram
- Depends on: External API keys via env vars
- Used by: Cron pipeline layer

**Shared Utilities:**
- Purpose: Formatting, constants, calculations
- Location: `src/lib/format.ts`, `src/lib/constants/`, `src/lib/calculator.ts`
- Contains: Price formatting (Korean won), region codes, rate type labels, loan calculator
- Used by: Pages, components, API routes

## Data Flow

**Daily Transaction Ingestion:**

1. Vercel Cron triggers `GET /api/cron/fetch-transactions?batch=N` (5 batches, staggered 10min apart starting 20:00 KST)
2. Route handler calls `fetchTransactions()` from `src/lib/api/molit.ts` for each region in the batch
3. Parsed transactions are upserted into `apt_transactions` table; new complexes inserted into `apt_complexes`
4. After all batches complete, `/api/cron/enrich-complexes` adds building details via building ledger API (21:50)
5. `/api/cron/validate-data` runs data quality checks (22:50)
6. `/api/cron/generate-report` creates daily summary in `daily_reports` (23:00)
7. `/api/cron/refresh-cache` updates `homepage_cache` (single-row denormalized cache)
8. `/api/cron/send-push` sends web push notifications to subscribers (23:05)

**Page Rendering (Homepage Example):**

1. User requests `/` -> Next.js renders `src/app/page.tsx` as Server Component
2. Page calls `createClient()` from `src/lib/supabase/server.ts` (returns `DbClient`)
3. First tries `homepage_cache` table (single query vs 7+ queries)
4. Falls back to parallel queries on `apt_transactions`, `finance_rates`, `page_views`
5. Server Component renders HTML with data; `revalidate = 300` (5 min ISR)
6. Client components (`RankingTabs`, `PropertyTypeFilter`) hydrate for interactivity

**Search Flow:**

1. User enters query in search form (GET `/search?q=...`)
2. `src/app/search/page.tsx` renders search UI (client component for interactivity)
3. API call to `GET /api/search?q=...` -> `src/app/api/search/route.ts`
4. Route handler uses raw `getPool().query()` with parameterized SQL (not QueryBuilder)
5. Searches `apt_complexes` with ILIKE, region code matching, and optional filters (price, size, built year)

**State Management:**
- Server state: ISR with `revalidate` exports (300s for listings, 3600s for detail pages)
- Client state: React `useState`/`useContext` for theme, auth, UI interactions
- Auth state: Firebase `onAuthStateChanged` via `AuthProvider` context
- Theme state: `ThemeProvider` context with `localStorage` persistence + `data-theme` attribute on `<html>`
- No global state management library (no Redux, Zustand, etc.)
- Homepage uses `homepage_cache` DB table as server-side cache (refreshed by cron)

## Key Abstractions

**DbClient (Supabase-compatible Query Builder):**
- Purpose: Drop-in replacement for Supabase client, executes against CockroachDB via `pg` Pool
- Location: `src/lib/db/client.ts`
- Pattern: Fluent builder pattern with thenable (`.from("table").select("*").eq("col", val)`)
- Supports: select, insert, upsert, update, delete, order, limit, range, single, rpc, abortSignal
- All server code imports via `src/lib/supabase/server.ts` which wraps `createDbClient()`

**Region Hierarchy:**
- Purpose: Map Korean administrative region codes to names and slugs
- Location: `src/lib/constants/region-codes.ts`
- Pattern: Static const object `REGION_HIERARCHY` keyed by 2-digit sido code, containing sigungu details
- Used for: URL routing, search, data aggregation, cron batch grouping

**Property Types:**
- Purpose: Distinguish apartment, officetel, row house types
- Location: `src/lib/constants/property-types.ts`
- Pattern: Numeric enum (1=apartment, 2=officetel, 3=row house)

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page request
- Responsibilities: HTML structure, `ThemeProvider`, `AuthProvider`, header nav, footer, Kakao/GA/AdSense script loading, PWA manifest

**Homepage:**
- Location: `src/app/page.tsx`
- Triggers: GET `/`
- Responsibilities: Hero section with dramatic transaction, stats bar, rate bar, ranking tabs, popular complexes sidebar

**Cron Entry Points:**
- Location: `src/app/api/cron/*/route.ts` (17 handlers)
- Triggers: Vercel Cron scheduler per `vercel.json`
- Responsibilities: All authenticated via `CRON_SECRET` Bearer token; data ingestion, processing, content generation

**Admin Dashboard:**
- Location: `src/app/dam/` (pages: dashboard, data, content, cron, comments, users, settings)
- Triggers: Authenticated admin users (email allowlist)
- Responsibilities: Data management, cron monitoring, content queue, user management

## Error Handling

**Strategy:** Graceful degradation with empty state fallbacks

**Patterns:**
- Server Components wrap DB queries in try/catch, return empty arrays on failure: `src/app/page.tsx` lines 55-124
- Global error boundary: `src/app/error.tsx` (client component with reset button)
- Global not-found: `src/app/not-found.tsx`
- Per-page loading states: `src/app/*/loading.tsx` for Suspense boundaries
- API routes return `NextResponse.json({ error: message }, { status: 500 })` on failure
- Cron routes send Slack alerts on failure via `sendSlackAlert()` from `src/lib/alert.ts`
- Firebase config uses graceful fallback with dummy values if env vars missing: `src/lib/firebase/config.ts`
- DB pool auto-recreates on connection error: `src/lib/db/client.ts` lines 23-26
- `Promise.allSettled` used for parallel queries to prevent single failure from blocking all: `src/app/page.tsx` line 88

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` with prefixed tags (e.g., `[Homepage]`, `[db]`, `[Search API]`)

**Validation:** Minimal input validation in API routes; `searchParams` parsed with fallback defaults; no schema validation library (no Zod/Yup)

**Authentication:**
- Client-side: Firebase Auth (Google provider) via `AuthProvider` in `src/components/providers/AuthProvider.tsx`
- Admin check: Email-based allowlist in `src/lib/admin/auth.ts` using `NEXT_PUBLIC_ADMIN_EMAILS` env var
- Cron auth: Bearer token matching `CRON_SECRET` env var
- Server-side Firebase Admin for token verification: `src/lib/firebase/admin.ts`

**SEO:**
- JSON-LD structured data via `src/components/seo/JsonLd.tsx` (FAQ, BreadcrumbList, ItemList schemas)
- Per-page `Metadata` exports with title templates, descriptions, canonical URLs
- Dynamic OG images via `opengraph-image.tsx` files using `@vercel/og`
- `sitemap.ts` and `robots.ts` at app root
- Separate apt sitemap: `src/app/apt/sitemap.ts`

**Theming:** CSS custom properties with `data-theme` attribute; no CSS-in-JS; Tailwind v4 with `@tailwindcss/postcss`

**Monetization:** Google AdSense (`AdSlot` component at `src/components/ads/AdSlot.tsx`), Coupang affiliate (`CoupangBanner` at `src/components/CoupangBanner.tsx`)

**Push Notifications:** Web Push via `web-push` package; service worker at `public/sw.js`; subscription endpoint at `/api/push/subscribe`

**Analytics:** Custom page view tracking to `page_views` table via `/api/analytics/pageview`; Google Analytics 4; UTM tracking component at `src/components/analytics/UTMTracker.tsx`

## Database Schema (CockroachDB)

**Core Tables:**
- `apt_complexes` - Apartment complex master data (region, name, slug, coords, building info)
- `apt_transactions` - Individual trade records (price, date, size, floor, change_rate, drop_level)
- `finance_rates` - Interest rate snapshots (BASE_RATE, COFIX, CD_91, TREASURY_3Y)
- `daily_reports` - Generated daily summaries with top drops/highs (JSONB)
- `page_views` - Analytics tracking per page per day
- `homepage_cache` - Single-row denormalized cache for homepage data
- `content_queue` - Social media content pipeline (card news images)
- `seeding_queue` - Community seeding content pipeline
- `push_subscriptions` - Web push notification endpoints

**Schema location:** `scripts/cockroach-schema.sql`

**Key indexes:**
- Composite on `(region_code, trade_date)` for regional queries
- On `change_rate ASC WHERE change_rate IS NOT NULL` for drop rankings
- Unique on `(apt_name, size_sqm, floor, trade_date, trade_price)` for deduplication
- On `(latitude, longitude) WHERE latitude IS NOT NULL` for map queries

---

*Architecture analysis: 2026-03-26*
