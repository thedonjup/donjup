# Technology Stack

**Analysis Date:** 2026-03-27

## Languages

**Primary:**
- TypeScript 5.x - Used throughout codebase for type safety in React/Next.js
- TSX (TypeScript + JSX) - React component files with type annotations

**Secondary:**
- JavaScript (Node.js runtime) - Utility scripts, server-side operations
- CSS - Styling via TailwindCSS v4

## Runtime

**Environment:**
- Node.js (version managed by `.nvmrc` or package.json engines)
- Vercel deployment platform (production)
- Netlify plugin for Next.js (`@netlify/plugin-nextjs` v5.15.9)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (implied by npm usage)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack React framework with API routes, server components, and image optimization
- React 19.2.4 - UI library
- React DOM 19.2.4 - DOM rendering

**Styling:**
- TailwindCSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS integration for TailwindCSS
- PostCSS - CSS transformation (implicit via TailwindCSS)

**Charting & Data Viz:**
- Recharts 3.8.0 - React charting library for visualizing real estate data

**Open Graph & Social:**
- @vercel/og 0.11.1 - Dynamic Open Graph image generation for social sharing

## Key Dependencies

**Critical:**
- Firebase 12.11.0 - Client-side auth and Firestore integration
- firebase-admin 13.7.0 - Server-side Firebase authentication and admin operations
- pg 8.20.0 - PostgreSQL client for CockroachDB connection
- web-push 3.6.7 - Web Push API for push notifications

**Infrastructure:**
- dotenv 17.3.1 - Environment variable loading (development)
- tsx 4.21.0 - TypeScript executor for Node.js scripts
- @types/node 20.x - TypeScript types for Node.js
- @types/react 19.x - TypeScript types for React
- @types/react-dom 19.x - TypeScript types for React DOM
- @types/pg 8.20.0 - TypeScript types for PostgreSQL client
- @types/web-push 3.6.4 - TypeScript types for web-push

## Development & Build

**Linting:**
- ESLint 9.x - Code quality and consistency
- eslint-config-next 16.2.1 - Next.js-specific ESLint rules

**Transpilation & Build:**
- Next.js built-in bundler - Automatic transpilation and code splitting
- TypeScript compiler (tsc) - Type checking via TypeScript language server

## Configuration

**Environment:**
- Environment variables via `.env.local` (development) and deployment platform secrets
- Key variables:
  - `DATABASE_URL` - PostgreSQL/CockroachDB connection string
  - `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase public API key
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
  - `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
  - `FIREBASE_ADMIN_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_KEY` - Admin JSON
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Web Push public key
  - `VAPID_PRIVATE_KEY` - Web Push private key
  - `CRON_SECRET` - Bearer token for cron endpoints
  - `SLACK_WEBHOOK_URL` - Slack alerts
  - `NODE_ENV` - Set to "development" or "production"

**Build:**
- `next.config.ts` - Next.js configuration with CSP headers, cache control, and service worker setup
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` → `./src/*`)
- `eslint.config.mjs` - ESLint flat config combining Next.js core-web-vitals and TypeScript rulesets

## Platform Requirements

**Development:**
- Node.js LTS or current version
- npm or compatible package manager
- TypeScript knowledge for contributions

**Production:**
- Vercel deployment (primary): `npx vercel --prod --yes`
- CockroachDB or PostgreSQL database with `ssl: { rejectUnauthorized: false }` for CockroachDB
- Neon database support possible (API wrapper supports Postgres protocol)
- Firebase project (authentication + optional Firestore)
- External API credentials for data enrichment (MOLIT, REB, ECOS, Finlife, Naver, Coupang, Instagram)

## Cache & Service Worker

**Service Worker (`/public/sw.js`):**
- Caches static assets in `_next/static/` and images
- Does NOT cache HTML, RSC payloads, API responses, or itself
- Registered with `updateViaCache: 'none'` for immediate updates
- Activates with full cache cleanup on version change

**HTTP Headers:**
- HTML pages: `Cache-Control: no-cache, no-store, must-revalidate`
- Static assets: Default long-term caching for hashed filenames
- Service Worker: `Cache-Control: no-cache, no-store, must-revalidate`

---

*Stack analysis: 2026-03-27*
