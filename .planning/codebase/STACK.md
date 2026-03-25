# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- TypeScript 5.x - All application code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- SQL - Database schemas and migration scripts (`scripts/*.sql`)
- JavaScript - Configuration files (`eslint.config.mjs`, `postcss.config.mjs`)

## Runtime

**Environment:**
- Node.js (no `.nvmrc` present; inferred from Next.js 16 requirements: Node 18.18+)

**Package Manager:**
- pnpm (lockfile: `pnpm-lock.yaml`)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack React framework (App Router)
  - Config: `next.config.ts`
  - Uses `serverExternalPackages` for `pg` and `postgres`
  - Security headers configured: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- React 19.2.4 - UI library
- React DOM 19.2.4 - DOM rendering

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
  - PostCSS plugin: `@tailwindcss/postcss` (config: `postcss.config.mjs`)
  - Global styles: `src/app/globals.css`
  - Custom CSS variables for theming (dark/light mode via `data-theme` attribute on `<html>`)

**Linting:**
- ESLint 9.x with `eslint-config-next` (core-web-vitals + typescript presets)
  - Config: `eslint.config.mjs` (flat config format)
  - Run via: `pnpm lint` (aliased to `eslint`)

**Build/Dev:**
- tsx 4.21.0 - TypeScript script execution for CLI scripts in `scripts/`
- dotenv 17.3.1 - Environment variable loading for scripts

## Key Dependencies

**Critical:**
- `pg` 8.20.0 - PostgreSQL client (primary database driver)
  - Used via custom QueryBuilder in `src/lib/db/client.ts`
  - Connection pool: max 5, idle timeout 30s, connect timeout 10s
  - SSL enabled with `rejectUnauthorized: false`
- `@neondatabase/serverless` 1.0.2 - Neon serverless driver (present in deps, secondary to `pg`)
- `postgres` 3.4.8 - Alternative PostgreSQL client (available, not primary)
- `firebase` 12.11.0 - Client-side Firebase SDK (Auth + Firestore)
  - Config: `src/lib/firebase/config.ts`
- `firebase-admin` 13.7.0 - Server-side Firebase Admin SDK (Auth token verification)
  - Config: `src/lib/firebase/admin.ts`

**UI/Visualization:**
- `recharts` 3.8.0 - React charting library (price trends, rate charts)

**Infrastructure:**
- `web-push` 3.6.7 - Web Push notifications (VAPID-based PWA push)
- `@vercel/og` 0.11.1 - OG image generation at the edge (used in `opengraph-image.tsx` files)

**Dev-only:**
- `@netlify/plugin-nextjs` 5.15.9 - Netlify adapter (in devDependencies; Vercel is primary)
- `@types/node` 20, `@types/react` 19, `@types/react-dom` 19, `@types/pg` 8.20.0, `@types/web-push` 3.6.4

## Database

**Primary Database:**
- CockroachDB (PostgreSQL wire-compatible)
  - Connection: `DATABASE_URL` env var (format: `postgresql://user:pass@host:26257/donjup?sslmode=verify-full`)
  - Client: `pg` Pool singleton via `src/lib/db/client.ts`

**ORM/Query Layer:**
- Custom QueryBuilder class (`src/lib/db/client.ts`) -- no external ORM
  - API mimics Supabase PostgREST for drop-in compatibility after migration from Supabase
  - Chainable methods: `.select()`, `.eq()`, `.neq()`, `.gt()`, `.lt()`, `.gte()`, `.lte()`, `.like()`, `.ilike()`, `.is()`, `.in()`, `.not()`, `.or()`, `.order()`, `.limit()`, `.range()`, `.single()`
  - Mutation methods: `.insert()`, `.upsert()`, `.update()`, `.delete()`
  - RPC caller: `db.rpc("fn_name", { args })` calls stored procedures via `SELECT * FROM "fn_name"(params)`
  - Thenable: supports `await db.from("table").select()` pattern
  - Storage stub: `db.storage.from("bucket")` builds public URLs from `NEXT_PUBLIC_SUPABASE_URL`
- Server-side only: `src/lib/supabase/client.ts` throws on client-side usage
- Server wrapper: `src/lib/supabase/server.ts` re-exports `createDbClient()` as `createClient()` / `createServiceClient()`

**File Storage:**
- Supabase Storage (images/assets only -- not using Supabase DB)
  - URL via `NEXT_PUBLIC_SUPABASE_URL`
  - Public URL pattern: `{supabaseUrl}/storage/v1/object/public/{bucket}/{path}`

**Caching:**
- In-memory caching in `src/lib/api/naver-news.ts` (6-hour TTL, max 200 entries)
- Next.js `fetch` with `next: { revalidate: 3600 }` in Coupang API calls
- Cron-based cache refresh via `/api/cron/refresh-cache`
- No external cache layer (no Redis/Memcached)

## Configuration

**Environment:**
- `.env.local` - Local development (git-ignored)
- `.env.local.example` - Template documenting all required env vars
- `.env.vercel` - Vercel-specific overrides (git-ignored)

**TypeScript:**
- `tsconfig.json` - Target ES2017, strict mode, bundler module resolution
- Path alias: `@/*` maps to `./src/*`
- JSX: `react-jsx` (automatic runtime)
- Incremental compilation enabled
- Excludes: `node_modules`, `scripts`

**Build:**
- `next.config.ts` - Security headers, `serverExternalPackages: ["pg", "postgres"]`
- `postcss.config.mjs` - Tailwind CSS via `@tailwindcss/postcss` plugin
- `eslint.config.mjs` - ESLint flat config with Next.js core-web-vitals + TypeScript

## PWA

- `public/manifest.json` - Web app manifest
  - Display: standalone
  - Categories: finance, news
  - Shortcuts: search, map, rent pages
- Push notifications via VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- `web-push` library for server-side push delivery
- Service worker subscription endpoint: `/api/push/subscribe`

## Platform Requirements

**Development:**
- Node.js 18.18+
- pnpm
- CockroachDB-compatible PostgreSQL database
- Firebase project (for auth)
- API keys listed in `.env.local.example`

**Production:**
- Vercel (primary deployment)
  - Project: `arbadas-projects-fdc12d41/donjup`
  - Domains: `donjup.com`, `www.donjup.com`
  - Deploy command: `npx vercel --prod --yes`
  - 23 Vercel Cron jobs configured in `vercel.json`
- CockroachDB cloud instance
- Supabase (storage only)
- Firebase (auth + Firestore for comments)

## Scripts

**npm scripts (`package.json`):**
```bash
pnpm dev          # Next.js development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint check
```

**Utility scripts (`scripts/`):**
- `backfill-transactions.ts` - Backfill transaction data
- `backfill-nationwide-3yr.ts` - 3-year nationwide data backfill
- `recalculate-prices.ts` - Recalculate price statistics
- `seed-transactions.ts` - Seed initial transaction data
- SQL schemas: `cockroach-schema.sql`
- SQL migrations: `migrate.sql`, `migrate-rent.sql`, `migrate-v3.sql`
- SQL utilities: `recalculate-all.sql`, `recalculate-batch.sql`, `status.sql`
- SQL checks: `check-byeoksan.sql`, `check-null-stats.sql`, `verify-nowon.sql`

---

*Stack analysis: 2026-03-26*
