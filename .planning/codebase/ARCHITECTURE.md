# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Next.js 16 with SSR (Server-Side Rendering) and Server Components, integrated with PostgreSQL backend and Firebase authentication.

**Key Characteristics:**
- Full-stack React with async server components for data fetching
- Hybrid client/server component model with clear separation
- Cron job system for scheduled data ingestion (fetching transactions, rates, enrichment)
- Custom QueryBuilder abstraction over PostgreSQL client library (`pg`)
- Firebase for real-time authentication and Firestore for user data
- Service-oriented API layer with content generation pipelines

## Layers

**Presentation Layer (Frontend):**
- Purpose: Render React components to HTML/interactive UI
- Location: `src/app/` (pages, layouts) and `src/components/` (reusable components)
- Contains: Server components for initial data fetch + Client components for interactivity
- Depends on: API routes (`src/app/api/`), client libraries (Firebase, Recharts, Kakao Maps SDK)
- Used by: End users accessing web pages

**API/Route Layer:**
- Purpose: Handle HTTP requests, orchestrate business logic, validate inputs
- Location: `src/app/api/` (RESTful endpoints and cron jobs)
- Contains: Route handlers (`route.ts` files) organized by feature (apt, analytics, cron)
- Depends on: Database client, business logic, external APIs (MOLiT, Kakao, Bank rates)
- Used by: Frontend pages, client-side fetches, external cron triggers

**Business Logic Layer:**
- Purpose: Core processing logic for data transformation, calculations, and pipelines
- Location: `src/lib/` (utilities, API wrappers, calculations)
- Contains:
  - `lib/api/` — Wrappers for external APIs (MOLiT transactions, Kakao geocoding)
  - `lib/analytics/` — Page view tracking and analytics
  - `lib/cardnews/` — Card news generation templates
  - `lib/admin/` — Admin operations
  - `lib/calculator.ts` — Loan and financial calculations
  - Utilities: `format.ts`, `alert.ts`, `logger.ts`
- Depends on: Database client, external service SDKs
- Used by: API routes, scheduled cron jobs

**Data Access Layer:**
- Purpose: Abstract database operations with query builder pattern
- Location: `src/lib/db/` (`client.ts`, `server.ts`)
- Contains: QueryBuilder class mimicking Supabase PostgREST API
- Depends on: PostgreSQL client (`pg` library), DATABASE_URL environment variable
- Used by: API routes and server components for data queries

**Configuration & Constants:**
- Purpose: Centralized configuration, type definitions, constants
- Location: `src/lib/constants/`, `src/types/`
- Contains:
  - Region hierarchies and property type definitions (`region-codes.ts`, `property-types.ts`)
  - Database type interfaces (`db.ts`, `api.ts`)
  - Format utilities and display labels
- Used by: Throughout application

**External Integrations:**
- Firebase Authentication (`src/lib/firebase/` — Google Sign-in)
- PostgreSQL (CockroachDB) — Real estate transaction data, user subscriptions
- MOLiT API (국토교통부 실거래가) — Official transaction data
- Kakao Maps/Geocoding API — Map display and address conversion
- Bank Rate APIs — Mortgage interest rates
- Coupang Affiliate — Product recommendations
- Instagram API — Post scheduling and publishing
- Google Analytics/AdSense — Metrics and monetization
- Slack Webhooks — Error/alert notifications

## Data Flow

**Homepage/Listing Page Flow:**

1. User requests page (e.g., `/today`)
2. Server component in `src/app/today/page.tsx` calls `createClient()` → `getPool()` (lazy-initialized PostgreSQL connection)
3. QueryBuilder chains queries: `.from("apt_transactions").select(...).eq(...).order(...).limit(...)`
4. Results marshaled into TypeScript interfaces (`AptTransaction`, `FinanceRate`)
5. Server component renders initial HTML with data
6. Client-side hydration adds interactivity (filters, sorting, modal dialogs)
7. Optional client-side fetching via `fetch()` (e.g., search autocomplete) to API routes

**Cron Job Flow:**

1. External trigger (e.g., Vercel Cron) calls `/api/cron/fetch-transactions?batch=0&date=2026-03-27`
2. Route handler validates `Authorization: Bearer CRON_SECRET` header
3. Fetches from MOLiT API (region by region to avoid rate limits, with `delay()`)
4. Parses raw transaction data, calculates `highest_price`, `change_rate`, `is_new_high`, `is_significant_drop`
5. Upserts into `apt_transactions` table (on duplicate, update changed fields)
6. Updates related cache tables (e.g., `homepage_cache`)
7. Queues generated content (CardNews, Seeding) in `content_queue` / `seeding_queue`
8. On error, sends Slack alert via `sendSlackAlert()`

**State Management:**

- **Server-side:** No global state. Data fetched per-request, cached via HTTP `Cache-Control` headers and Next.js `revalidate` option
- **Client-side:** React Context for theme (ThemeProvider), authentication (AuthProvider), and local filters
- **Database:** Single source of truth; homepage aggregates pre-computed summaries in `homepage_cache` table for performance

## Key Abstractions

**QueryBuilder (Custom ORM-like):**
- Purpose: Provide Supabase PostgREST-like query chaining interface without external dependency
- Examples: `src/lib/db/client.ts`
- Pattern: Method chaining — `.from().select().eq().order().limit().single()`
- Transforms to parameterized SQL — `$1, $2` placeholders prevent SQL injection

**Server Component + Client Component Split:**
- Purpose: Render static content on server (fast, no JS), interactivity on client (hydrated React)
- Examples:
  - Server: `src/app/today/page.tsx` fetches transaction list
  - Client: `src/components/PropertyTypeFilter` lets user filter by property type
- Pattern: "use client" boundary — components marked `"use client"` run in browser; unmarked run on server

**API Module Pattern (External APIs):**
- Purpose: Wrap third-party APIs with typed responses and retry logic
- Examples:
  - `src/lib/api/molit.ts` — Fetches official transaction data, parses XML
  - `src/lib/api/kakao.ts` — Reverse geocoding, coordinates to address
- Pattern: Export async functions that handle auth, rate limits, error handling

**Cron Job Routing:**
- Purpose: Batch long-running tasks into parallel chunks (5 geographic batches)
- Examples: `/api/cron/fetch-transactions?batch=0` (Seoul, Busan, Daegu only)
- Pattern: Query parameter `batch` selects predefined region group to avoid 5-minute timeout

**Firebase Auth Provider (React Context):**
- Purpose: Manage user authentication state across app
- Location: `src/components/providers/AuthProvider.tsx`
- Pattern: Wraps `onAuthStateChanged()` listener, exposes `useAuth()` hook
- Integrates: Google Sign-in with `signInWithPopup(GoogleAuthProvider)`

**Theme Provider (CSS Variables):**
- Purpose: Switch dark/light mode without page reload
- Location: `src/components/providers/ThemeProvider.tsx`
- Pattern: Sets `data-theme` attribute on `<html>`, CSS uses `var(--color-*)` custom properties
- Persistence: Stored in `localStorage` with fallback to system preference

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (root layout)
- Triggers: HTTP request to any URL path
- Responsibilities:
  - Wrap app with ThemeProvider and AuthProvider
  - Load analytics scripts (Google Analytics, Kakao Maps SDK)
  - Register service worker for PWA caching
  - Render header, footer, main content
  - Apply global metadata (SEO, viewport)

**API Routes:**
- Location: `src/app/api/[feature]/route.ts`
- Triggers: HTTP GET/POST to `/api/*` paths
- Responsibilities:
  - Validate request (headers, query params, body)
  - Call business logic (database queries, external API calls)
  - Return JSON response with appropriate status codes
  - Log errors and alert on critical failures

**Cron Jobs:**
- Location: `src/app/api/cron/*/route.ts`
- Triggers: Scheduled HTTP GET requests (e.g., every 6 hours)
- Responsibilities:
  - Auth validation via `CRON_SECRET` environment variable
  - Fetch and process data from external sources
  - Upsert results into database
  - Update derived caches (e.g., `homepage_cache`)
  - Queue content generation tasks (CardNews, Instagram)

**Dynamic Pages:**
- Location: `src/app/[route]/page.tsx` or `src/app/[id]/[subroute]/page.tsx`
- Triggers: Navigation to path matching file structure
- Responsibilities:
  - Fetch data server-side (via `createClient()`)
  - Render initial HTML with data
  - Hydrate client-side interactivity
  - Set page-specific metadata (title, description, OpenGraph)

## Error Handling

**Strategy:** Three-tier error handling — catch at API boundary, log, notify, return user-friendly JSON/HTML

**Patterns:**

- **API Routes:** Wrap business logic in try-catch, return `NextResponse.json({ error: "..." }, { status: 500 })`
  - Example: `src/app/api/apt/route.ts` catches database errors and logs with context

- **Server Components:** Let errors bubble to `src/app/error.tsx` (Error Boundary)
  - User sees "일시적인 오류가 발생했습니다" (temporary error) with "retry" button

- **Client Components:** No automatic error boundary — handle Promise rejections in event handlers
  - Log to console in dev, silently fail (or show toast) in production

- **Logging:** Structured JSON logs via `src/lib/logger.ts`
  - In development: Pretty-print to console
  - In production: Write JSON to stdout (Vercel captures as logs)

- **Alerting:** Critical errors trigger Slack webhook via `src/lib/alert.ts`
  - Example: Cron job failure sends alert to #alerts channel

## Cross-Cutting Concerns

**Logging:**
- Implementation: `src/lib/logger.ts` exports `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`
- Usage: Pass contextual data as second argument — `logger.error("Failed to fetch", { route: "/api/apt", error })`
- Structured: Includes timestamp, level, message, and custom fields

**Validation:**
- Request parameters: Manual parsing in route handlers
  - Example: `parseInt(searchParams.get("page") ?? "1", 10)` with fallback
  - Database constraints enforced at schema level (e.g., NOT NULL, UNIQUE indexes)
- No centralized validation middleware; each route validates its own inputs

**Authentication:**
- Firebase Auth for user login (Google Sign-in)
- Session managed via Firebase ID token (client-side only)
- Protected routes: Client-side redirect if `user === null` in page component
- Admin routes: Check user email against allowlist in `src/lib/admin/`

**Caching:**
- **HTTP:** `Cache-Control: no-cache, no-store, must-revalidate` on HTML (prevents stale UI after deploy)
- **Next.js:** `revalidate = 300` (seconds) on page components — ISR (Incremental Static Regeneration)
- **Service Worker:** Caches `_next/static/` (JS bundles, images) but NOT HTML or API responses
- **Database:** Pre-computed summary tables (`homepage_cache`, etc.) reduce query load

**Analytics:**
- Page views: Client-side tracking via `src/components/analytics/UTMTracker.tsx`
- Events: Google Analytics (`gtag`) on search, apt view, filter clicks
- Stored in: `page_views` table for internal dashboard

---

*Architecture analysis: 2026-03-27*
