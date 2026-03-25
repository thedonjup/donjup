# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```
donjup/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── layout.tsx          # Root layout (header, footer, providers)
│   │   ├── page.tsx            # Homepage
│   │   ├── error.tsx           # Global error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   ├── loading.tsx         # Global loading state
│   │   ├── globals.css         # Global styles + CSS custom properties
│   │   ├── sitemap.ts          # Dynamic sitemap generator
│   │   ├── robots.ts           # robots.txt generator
│   │   ├── opengraph-image.tsx # Root OG image
│   │   ├── about/              # /about - Service introduction
│   │   ├── apt/                # /apt/[region]/[slug] - Apartment detail
│   │   ├── compare/            # /compare - Complex comparison (client)
│   │   ├── daily/              # /daily, /daily/[date], /daily/archive
│   │   ├── dam/                # /dam - Admin dashboard (noindex)
│   │   ├── map/                # /map - Kakao map view
│   │   ├── market/             # /market, /market/[sido], /market/[sido]/[sigungu]
│   │   ├── new-highs/          # /new-highs - New high price listings
│   │   ├── privacy/            # /privacy - Privacy policy
│   │   ├── profile/            # /profile - User profile
│   │   ├── rate/               # /rate, /rate/calculator
│   │   ├── rent/               # /rent - Rent/lease listings
│   │   ├── search/             # /search - Apartment search
│   │   ├── themes/             # /themes, /themes/[slug] - Themed collections
│   │   ├── today/              # /today - Today's transactions
│   │   ├── trend/              # /trend - Market trends
│   │   └── api/                # API route handlers
│   │       ├── admin/          # Admin API (user management)
│   │       ├── analytics/      # Page view tracking, popular items
│   │       ├── apt/            # Apartment data endpoints
│   │       ├── bank-rates/     # Bank mortgage rate comparison
│   │       ├── coupang/        # Coupang affiliate product API
│   │       ├── cron/           # 17 scheduled cron handlers
│   │       ├── daily/          # Daily report endpoints
│   │       ├── dam/            # Admin data management
│   │       ├── geocode/        # Geocoding endpoint
│   │       ├── news/           # News feed
│   │       ├── push/           # Push notification subscription
│   │       ├── rate/           # Rate calculation, history
│   │       ├── search/         # Apartment search
│   │       ├── seeding/        # Content seeding data
│   │       └── test-db/        # DB connection test
│   ├── components/             # Shared React components
│   │   ├── ads/                # AdSlot.tsx, InfeedAd.tsx
│   │   ├── analytics/          # SearchTracker, UTMTracker, ViewDetailTracker
│   │   ├── apt/                # AptNews, Comments, FavoriteButton, MiniLoanCalculator, NotifyButton, TransactionTabs
│   │   ├── auth/               # LoginModal.tsx, UserMenu.tsx
│   │   ├── charts/             # PriceHistoryChart, MiniAreaChart (+ Wrapper variants)
│   │   ├── home/               # RankingTabs.tsx
│   │   ├── layout/             # BackToTop.tsx, MobileNav.tsx
│   │   ├── map/                # KakaoMap.tsx
│   │   ├── onboarding/         # RegionSelector.tsx
│   │   ├── providers/          # AuthProvider.tsx, ThemeProvider.tsx
│   │   ├── seo/                # JsonLd.tsx
│   │   ├── skeleton/           # RankingCardSkeleton, RateCardSkeleton, TransactionTableSkeleton
│   │   ├── CoupangBanner.tsx   # Coupang affiliate banner
│   │   ├── PropertyTypeFilter.tsx # Property type tabs (apt/officetel/rowhouse)
│   │   ├── PushPrompt.tsx      # Push notification opt-in prompt
│   │   └── ShareButtons.tsx    # Social share buttons (Kakao, etc.)
│   ├── lib/                    # Shared libraries and utilities
│   │   ├── admin/              # auth.ts (admin email check)
│   │   ├── analytics/          # events.ts, utm.ts
│   │   ├── api/                # External API wrappers
│   │   │   ├── molit.ts        # MOLIT apartment trade API
│   │   │   ├── molit-multi.ts  # MOLIT multi-housing API
│   │   │   ├── molit-rent.ts   # MOLIT rent/lease API
│   │   │   ├── ecos.ts         # Bank of Korea ECOS API
│   │   │   ├── finlife.ts      # Financial Supervisory Service API
│   │   │   ├── reb.ts          # Real Estate Board index API
│   │   │   ├── building-ledger.ts # Building ledger API
│   │   │   ├── naver-news.ts   # Naver news search API
│   │   │   ├── coupang.ts      # Coupang affiliate API
│   │   │   └── instagram.ts    # Instagram Graph API
│   │   ├── cardnews/           # Card news image generation
│   │   │   ├── generator.ts    # Orchestrates card news creation
│   │   │   ├── render.ts       # Renders JSX to image
│   │   │   ├── colors.ts       # Color palette
│   │   │   ├── types.ts        # Type definitions
│   │   │   └── templates/      # cover.tsx, cta.tsx, rank-item.tsx
│   │   ├── constants/          # Static data
│   │   │   ├── region-codes.ts # REGION_HIERARCHY (sido/sigungu codes)
│   │   │   ├── property-types.ts # Property type enum
│   │   │   └── rate-types.ts   # Rate type definitions
│   │   ├── db/                 # Database layer
│   │   │   └── client.ts       # QueryBuilder + Pool (CockroachDB)
│   │   ├── firebase/           # Firebase configuration
│   │   │   ├── config.ts       # Client-side Firebase init
│   │   │   └── admin.ts        # Server-side Firebase Admin
│   │   ├── instagram/          # Instagram posting client
│   │   │   └── client.ts
│   │   ├── supabase/           # Supabase-compatible wrappers
│   │   │   ├── server.ts       # createClient() / createServiceClient()
│   │   │   ├── client.ts       # Browser stub (throws error)
│   │   │   └── rent-client.ts  # Rent data client (same DB)
│   │   ├── alert.ts            # Slack webhook alerts
│   │   ├── calculator.ts       # Loan/mortgage calculator
│   │   ├── format.ts           # Price/size formatting utilities
│   │   └── kakao-share.ts      # Kakao share SDK wrapper
│   └── proxy.ts                # Proxy utility
├── public/                     # Static assets
│   ├── favicon.svg
│   ├── logo.svg
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker (push notifications)
│   └── ads.txt                 # Google AdSense ads.txt
├── scripts/                    # Database scripts and utilities
│   ├── cockroach-schema.sql    # Main CockroachDB schema
│   ├── migrate.sql             # Migration scripts
│   ├── migrate-rent.sql        # Rent table migrations
│   ├── migrate-v3.sql          # V3 migrations
│   ├── recalculate-all.sql     # Price recalculation
│   ├── recalculate-batch.sql   # Batch recalculation
│   ├── recalculate-prices.ts   # TS price recalculator
│   ├── backfill-transactions.ts # Historical data backfill
│   ├── backfill-nationwide-3yr.ts # 3-year nationwide backfill
│   ├── seed-transactions.ts    # Test data seeding
│   └── *.sql                   # Various diagnostic queries
├── supabase/                   # Legacy Supabase config
│   ├── schema.sql              # Original Supabase schema
│   └── migrations/             # Supabase migrations
├── docs/                       # Documentation
│   └── marketing/              # Marketing materials
├── next.config.ts              # Next.js configuration
├── vercel.json                 # Vercel config (cron schedules)
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration
├── postcss.config.mjs          # PostCSS (Tailwind) config
├── package.json                # Dependencies
├── pnpm-lock.yaml              # Lock file
└── pnpm-workspace.yaml         # PNPM workspace config
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router file-based routing
- Contains: Pages (page.tsx), layouts (layout.tsx), loading states (loading.tsx), OG images (opengraph-image.tsx), API routes (route.ts)
- Key files: `layout.tsx` (root layout with all providers), `page.tsx` (homepage)

**`src/app/api/cron/`:**
- Purpose: Scheduled data pipeline handlers
- Contains: 17 cron job route handlers, each in its own directory
- Key files: `fetch-transactions/route.ts` (main data ingestion), `refresh-cache/route.ts` (homepage cache update)
- Note: All require `Authorization: Bearer {CRON_SECRET}` header

**`src/app/dam/`:**
- Purpose: Admin dashboard (DAM = Data Admin Manager)
- Contains: Dashboard, data browser, content queue, cron manager, comments, users, settings pages
- Key files: `layout.tsx` (admin layout with noindex), `AdminLayout.tsx` (client-side admin nav)

**`src/components/`:**
- Purpose: Shared React components organized by domain
- Contains: Both server and client components; client components marked with `"use client"`
- Key files: `providers/AuthProvider.tsx`, `providers/ThemeProvider.tsx`, `map/KakaoMap.tsx`

**`src/lib/`:**
- Purpose: Core business logic, data access, utilities
- Contains: Database client, external API wrappers, constants, formatting
- Key files: `db/client.ts` (query builder), `format.ts` (price formatting), `constants/region-codes.ts`

**`src/lib/api/`:**
- Purpose: External API integration wrappers
- Contains: One file per external API source
- Key files: `molit.ts` (apartment trades), `ecos.ts` (interest rates), `molit-rent.ts` (rent data)

**`scripts/`:**
- Purpose: Database management, migrations, data backfill utilities
- Contains: SQL schema files, TypeScript migration/backfill scripts
- Key files: `cockroach-schema.sql` (canonical schema), `backfill-transactions.ts`
- Run with: `tsx scripts/filename.ts` (dev dependency)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout (providers, header, footer, scripts)
- `src/app/page.tsx`: Homepage (server component, ISR 300s)
- `src/app/api/cron/fetch-transactions/route.ts`: Main data pipeline entry

**Configuration:**
- `next.config.ts`: Next.js config (server external packages, security headers)
- `vercel.json`: Vercel cron schedules (17+ scheduled jobs)
- `tsconfig.json`: TypeScript config (strict mode, `@/*` path alias)
- `eslint.config.mjs`: ESLint config
- `postcss.config.mjs`: PostCSS/Tailwind config

**Core Logic:**
- `src/lib/db/client.ts`: Database query builder (845 lines, most critical file)
- `src/lib/supabase/server.ts`: Server-side DB client factory
- `src/lib/format.ts`: Korean price/size formatting
- `src/lib/constants/region-codes.ts`: Region code hierarchy
- `src/lib/alert.ts`: Slack webhook alerts

**Testing:**
- No test files exist in the codebase
- No test framework configured

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Loading states: `loading.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- OG images: `opengraph-image.tsx` (Next.js convention)
- Components: `PascalCase.tsx` (e.g., `KakaoMap.tsx`, `AuthProvider.tsx`)
- Utilities/libs: `kebab-case.ts` (e.g., `region-codes.ts`, `molit-rent.ts`)
- SQL scripts: `kebab-case.sql` (e.g., `cockroach-schema.sql`)

**Directories:**
- Route segments: `kebab-case` (e.g., `new-highs/`, `bank-rates/`)
- Dynamic segments: `[param]` (e.g., `[region]/`, `[slug]/`, `[date]/`)
- Component groups: `kebab-case` (e.g., `auth/`, `charts/`, `layout/`)

## Routing Structure

**Public Pages:**
| Route | File | Rendering | Revalidate |
|-------|------|-----------|------------|
| `/` | `src/app/page.tsx` | SSR (Server Component) | 300s |
| `/today` | `src/app/today/page.tsx` | SSR | 300s |
| `/new-highs` | `src/app/new-highs/page.tsx` | SSR | - |
| `/market` | `src/app/market/page.tsx` | SSR | 3600s |
| `/market/[sido]` | `src/app/market/[sido]/page.tsx` | SSR | - |
| `/market/[sido]/[sigungu]` | `src/app/market/[sido]/[sigungu]/page.tsx` | SSR | - |
| `/rent` | `src/app/rent/page.tsx` | SSR | - |
| `/rate` | `src/app/rate/page.tsx` | SSR | - |
| `/rate/calculator` | `src/app/rate/calculator/page.tsx` | Client | - |
| `/map` | `src/app/map/page.tsx` | SSR + Client | - |
| `/search` | `src/app/search/page.tsx` | SSR + Client | - |
| `/apt/[region]/[slug]` | `src/app/apt/[region]/[slug]/page.tsx` | SSR | 3600s |
| `/compare` | `src/app/compare/page.tsx` | Client | - |
| `/daily/[date]` | `src/app/daily/[date]/page.tsx` | SSR | - |
| `/daily/archive` | `src/app/daily/archive/page.tsx` | SSR | - |
| `/themes` | `src/app/themes/page.tsx` | SSR | - |
| `/themes/[slug]` | `src/app/themes/[slug]/page.tsx` | SSR | - |
| `/trend` | `src/app/trend/page.tsx` | SSR | - |
| `/about` | `src/app/about/page.tsx` | SSR | - |
| `/privacy` | `src/app/privacy/page.tsx` | SSR | - |
| `/profile` | `src/app/profile/page.tsx` | Client | - |

**Admin Pages (under `/dam`):**
| Route | Purpose |
|-------|---------|
| `/dam` | Dashboard overview |
| `/dam/data` | Data browser |
| `/dam/content` | Content queue management |
| `/dam/cron` | Cron job management |
| `/dam/comments` | Comment moderation |
| `/dam/users` | User management |
| `/dam/settings` | Settings |

**API Routes:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/apt` | GET | List complexes (paginated) |
| `/api/apt/[id]` | GET | Complex detail |
| `/api/apt/extremes` | GET | Top drops/highs |
| `/api/search` | GET | Apartment search |
| `/api/rate/calculate` | GET | Loan calculation |
| `/api/rate/history` | GET | Rate history |
| `/api/bank-rates` | GET | Bank mortgage rates |
| `/api/news` | GET | Real estate news |
| `/api/daily` | GET | Latest daily report |
| `/api/daily/[date]` | GET | Specific daily report |
| `/api/analytics/pageview` | POST | Track page view |
| `/api/analytics/popular` | GET | Popular pages |
| `/api/push/subscribe` | POST | Push subscription |
| `/api/geocode` | GET | Geocode address |
| `/api/coupang/products` | GET | Affiliate products |

## Where to Add New Code

**New Public Page:**
- Create directory: `src/app/{page-name}/`
- Add `page.tsx` (server component by default)
- Add `loading.tsx` for skeleton loading state
- Add `opengraph-image.tsx` for social sharing image
- Export `metadata` for SEO
- Export `revalidate` for ISR timing

**New API Route:**
- Create directory: `src/app/api/{endpoint-name}/`
- Add `route.ts` with exported HTTP method handlers (GET, POST, etc.)
- Use `createServiceClient()` from `src/lib/supabase/server.ts` for DB access
- Return `NextResponse.json()`

**New Cron Job:**
- Create directory: `src/app/api/cron/{job-name}/`
- Add `route.ts` with GET handler
- Add Bearer token auth check: `request.headers.get("Authorization") === \`Bearer \${process.env.CRON_SECRET}\``
- Add entry to `vercel.json` crons array
- Set `maxDuration` export if needed (up to 300s on Vercel Pro)

**New Shared Component:**
- Place in `src/components/{domain}/ComponentName.tsx`
- Add `"use client"` directive if it needs interactivity
- Domain directories: `ads/`, `analytics/`, `apt/`, `auth/`, `charts/`, `home/`, `layout/`, `map/`, `onboarding/`, `providers/`, `seo/`, `skeleton/`
- Standalone components go directly in `src/components/`

**New External API Wrapper:**
- Add file: `src/lib/api/{service-name}.ts`
- Export interface for parsed response
- Export async fetch function
- Add env var for API key

**New Utility Function:**
- General formatting: `src/lib/format.ts`
- Constants/enums: `src/lib/constants/{name}.ts`
- Domain-specific logic: `src/lib/calculator.ts` or new file in `src/lib/`

**New Database Table:**
- Add CREATE TABLE to `scripts/cockroach-schema.sql`
- Create migration script if needed
- No ORM; use QueryBuilder API or raw SQL via `getPool().query()`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: Yes (by Claude agents)
- Committed: No (in .gitignore conceptually, but tracked in working tree)

**`.netlify/`:**
- Purpose: Netlify build artifacts (legacy deployment)
- Generated: Yes
- Committed: Partially

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`.vercel/`:**
- Purpose: Vercel project config
- Generated: Yes
- Committed: No (contains project linking info)

**`supabase/`:**
- Purpose: Legacy Supabase schema and migrations (project migrated to CockroachDB)
- Generated: No
- Committed: Yes (historical reference)
- Note: Active schema is in `scripts/cockroach-schema.sql`

## Path Alias

**`@/*` maps to `./src/*`** (configured in `tsconfig.json`)

Use `@/lib/...`, `@/components/...`, `@/app/...` for all imports within the `src/` directory.

---

*Structure analysis: 2026-03-26*
