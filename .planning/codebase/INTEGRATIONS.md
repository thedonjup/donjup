# External Integrations

**Analysis Date:** 2026-03-27

## APIs & External Services

**Real Estate Data:**
- MOLIT (국토교통부 아파트매매 실거래가) - Apartment transaction data
  - SDK/Client: Native fetch via `src/lib/api/molit.ts` and `src/lib/api/molit-multi.ts`
  - Auth: `MOLIT_API_KEY` (environment variable)
  - Endpoint: `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`
  - Routes: `/api/cron/fetch-transactions`

- MOLIT Rent (전월세 데이터) - Rental market data
  - SDK/Client: Native fetch via `src/lib/api/molit-rent.ts`
  - Auth: `MOLIT_API_KEY`
  - Routes: `/api/cron/fetch-rents`

- REB (부동산원 지수) - Real estate index data
  - SDK/Client: Native fetch via `src/lib/api/reb.ts`
  - Auth: `REB_API_KEY`
  - Routes: `/api/cron/fetch-reb-index`

- Building Ledger (건축물대장) - Property details and characteristics
  - SDK/Client: Native fetch via `src/lib/api/building-ledger.ts`
  - Auth: `MOLIT_API_KEY`

**Financial Data:**
- ECOS (한국은행 경제통계) - Bank economic statistics
  - SDK/Client: Native fetch via `src/lib/api/ecos.ts`
  - Auth: `ECOS_API_KEY`

- Finlife (금융감독원) - Bank interest rate data
  - SDK/Client: Native fetch via `src/lib/api/finlife.ts`
  - Auth: `FINLIFE_API_KEY`
  - Routes: `/api/cron/fetch-bank-rates`, `/api/bank-rates`

**News & Content:**
- Naver Search API - News search with fallback to Google News RSS
  - SDK/Client: Native fetch via `src/lib/api/naver-news.ts`
  - Auth: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
  - Fallback: Google News RSS (no auth required)
  - Routes: `/api/cron/news`

**Social & Marketing:**
- Coupang Affiliate API - Product search and affiliate links
  - SDK/Client: Native fetch via `src/lib/api/coupang.ts`
  - Auth: `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, `COUPANG_AF_CODE`
  - HMAC-SHA256 signature authentication
  - Endpoint: `https://api.coupangcorp.com/v2/providers/affiliate_open_api`
  - Routes: `/api/coupang/products`, `/api/cron/coupang`

- Instagram Graph API - Social media publishing
  - SDK/Client: Native fetch via `src/lib/instagram/client.ts`
  - Auth: `INSTAGRAM_ACCESS_TOKEN` (long-lived page token), `INSTAGRAM_USER_ID`
  - Endpoint: `https://graph.facebook.com/v21.0`
  - Rate Limit: 25 published posts per 24-hour rolling window
  - Capabilities: Single photo publish, carousel/album publish (2-10 items)
  - Routes: `/api/cron/post-instagram`

- Kakao Developers - Maps and share functionality
  - SDK/Client: Kakao SDK loaded via script tag, initialized in `src/lib/kakao-share.ts`
  - Auth: `NEXT_PUBLIC_KAKAO_JS_KEY` (public key for JavaScript SDK)
  - CSP: Allows `https://dapi.kakao.com`, `https://kapi.kakao.com`, `https://t1.kakaocdn.net`, `https://t1.daumcdn.net`
  - Components: `src/components/map/KakaoMap.tsx` for map display, `src/lib/kakao-share.ts` for Kakao Talk sharing
  - Routes: `/map`, `/api/cron/geocode-complexes` (geolocation via Kakao)

- Google Analytics 4 - Analytics and traffic tracking
  - SDK/Client: Google Tag Manager integration (implied via CSP and analytics routes)
  - Auth: `GA4_PROPERTY_ID` (environment variable)
  - CSP: Allows `https://www.googletagmanager.com`, `https://www.google-analytics.com`, `https://stats.g.doubleclick.net`
  - Routes: `/api/analytics/pageview`, `/api/analytics/popular`

- Google AdSense - Ad monetization
  - SDK/Client: AdSlot component in `src/components/ads/AdSlot.tsx`
  - Auth: `NEXT_PUBLIC_ADSENSE_ID`
  - CSP: Allows `https://pagead2.googlesyndication.com`, `https://adservice.google.com`, `https://adservice.google.co.kr`

## Data Storage

**Primary Database:**
- PostgreSQL / CockroachDB
  - Connection: `DATABASE_URL` environment variable (connection string)
  - Client: `pg` v8.20.0 (native Node.js PostgreSQL driver)
  - Wrapper: Custom `QueryBuilder` in `src/lib/db/client.ts` (Supabase PostgREST API emulation)
  - Config: `src/lib/db/client.ts` with connection pooling (max 10 connections)
  - Important: `ssl: { rejectUnauthorized: false }` is REQUIRED for CockroachDB (ssl: true breaks connection)
  - Server Client: `src/lib/db/server.ts` exports `createServiceClient()` for server components and API routes

**Authentication & User Data:**
- Firebase Authentication
  - Provider: Google Firebase
  - Client SDK: `firebase` v12.11.0
  - Admin SDK: `firebase-admin` v13.7.0
  - Config: `src/lib/firebase/config.ts` (public keys)
  - Admin: `src/lib/firebase/admin.ts` (service account initialization)
  - Auth Variables:
    - Public: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
    - Server: `FIREBASE_ADMIN_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string)

- Firestore (optional for comments/user data)
  - Initialized via Firebase config
  - Used in: `src/components/apt/Comments.tsx`, `src/app/dam/comments/page.tsx`

**File Storage:**
- Local filesystem only (no explicit external file storage detected)
- Generated images uploaded to Instagram/social platforms via URL

**Caching:**
- Memory cache: In-app cache for news searches (6-hour TTL in `src/lib/api/naver-news.ts`)
- Service Worker: Client-side static asset caching with selective cache invalidation
- API response caching: `/api/cron/refresh-cache` for database-driven content

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (primary)
  - Implementation: OAuth2 via Firebase SDK
  - Used for: User login, token management
  - Provider: `src/components/providers/AuthProvider.tsx`

**Admin Authentication:**
- Email whitelist
  - Implementation: `src/lib/admin/auth.ts`
  - Config: `ADMIN_EMAILS` environment variable (comma-separated list)

**Cron Job Authentication:**
- Bearer token validation
  - Implementation: Check `Authorization` header against `CRON_SECRET`
  - Used in: All `/api/cron/*` routes
  - Routes: `/api/cron/analytics`, `/api/cron/fetch-transactions`, `/api/cron/send-push`, etc.

## Monitoring & Observability

**Error Tracking & Alerts:**
- Slack alerts
  - Implementation: `src/lib/alert.ts`
  - Auth: `SLACK_WEBHOOK_URL` (incoming webhook)
  - Usage: Error notifications from cron jobs and failed API calls

**Logging:**
- Custom logger in `src/lib/logger.ts`
  - Approach: Development mode logs to console, production logs to stderr
  - Level control: `NODE_ENV`

## CI/CD & Deployment

**Hosting:**
- Vercel (primary)
  - Project: arbadas-projects-fdc12d41/donjup
  - Domains: donjup.com, www.donjup.com
  - Deployment: `npx vercel --prod --yes` (manual CLI deployment)
  - Preview: Auto-deployed on git push

- Netlify (secondary/fallback)
  - Plugin: `@netlify/plugin-nextjs` v5.15.9

**CI Pipeline:**
- Git push triggers automatic Vercel deployment
- Manual CLI deployment available

**Cron Jobs (Vercel Cron):**
- Implementation: API routes with `maxDuration` configured (e.g., 300s for long-running jobs)
- Protected by: `CRON_SECRET` bearer token
- Routes: `/api/cron/*` for scheduled batch jobs

## Environment Configuration

**Required env vars (production):**
- `DATABASE_URL` - CockroachDB or PostgreSQL connection string
- `MOLIT_API_KEY` - Real estate transaction data
- `REB_API_KEY` - Real estate index
- `ECOS_API_KEY` - Bank economic statistics
- `FINLIFE_API_KEY` - Bank interest rates
- `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, `COUPANG_AF_CODE` - Product affiliate
- `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` - Social posting
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` - News search
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` - Authentication
- `FIREBASE_ADMIN_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_KEY` - Server-side auth
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` - Web push notifications
- `NEXT_PUBLIC_KAKAO_JS_KEY` - Kakao Maps & Share
- `NEXT_PUBLIC_ADSENSE_ID` - Google AdSense
- `GA4_PROPERTY_ID` - Google Analytics 4
- `CRON_SECRET` - Cron job authentication
- `SLACK_WEBHOOK_URL` - Error alerts
- `ADMIN_EMAILS` - Comma-separated admin email list
- `NODE_ENV` - "production" or "development"

**Secrets location:**
- Vercel: Environment variables in project settings
- Local development: `.env.local` (not committed)
- Never commit `.env` files with real secrets

## Webhooks & Callbacks

**Incoming:**
- `/api/push/subscribe` - Web Push subscription endpoint
- `/api/dam/content` - DAM (Digital Asset Management) content endpoint
- `/api/dam/data` - DAM data endpoint

**Outgoing:**
- Firebase Cloud Messaging - Push notifications via web-push library
- Instagram Graph API - Media publishing callbacks/status checks
- Slack webhooks - Error and alert notifications
- Google Analytics - Pageview and event tracking
- Coupang Affiliate API - Product search and link generation

---

*Integration audit: 2026-03-27*
