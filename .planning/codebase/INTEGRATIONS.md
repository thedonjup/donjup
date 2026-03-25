# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

### Real Estate Data (Korean Government)

**MOLIT (Ministry of Land, Infrastructure & Transport) - Apartment Sales:**
- Purpose: Fetch real-time apartment transaction data (sales)
- SDK/Client: Custom HTTP/XML wrapper in `src/lib/api/molit.ts`
- Auth: `MOLIT_API_KEY`
- Endpoint: `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`
- Response format: XML (parsed with regex-based `extractTag()` helper)
- Used in: Cron `/api/cron/fetch-transactions` (5 batches, staggered 10-min apart daily at 20:00-20:40 UTC)
- Key function: `fetchTransactions(regionCode, dealYearMonth)` returns `ParsedTransaction[]`

**MOLIT - Apartment Rentals:**
- Purpose: Fetch apartment rent/lease transaction data
- SDK/Client: `src/lib/api/molit-rent.ts`
- Auth: Same `MOLIT_API_KEY`
- Endpoint: `https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent`
- Used in: Cron `/api/cron/fetch-rents` (5 batches, staggered daily at 20:05-20:45 UTC)

**MOLIT - Multi-property Types:**
- Purpose: Fetch transactions for non-apartment property types (row houses, officetels, land, commercial)
- SDK/Client: `src/lib/api/molit-multi.ts`
- Auth: Same `MOLIT_API_KEY`
- Used in: Cron `/api/cron/fetch-transactions?type=2` and `type=3`

**MOLIT - Building Ledger:**
- Purpose: Fetch building registry data (unit count, parking, heating, FAR, coverage ratio, elevator count)
- SDK/Client: `src/lib/api/building-ledger.ts`
- Auth: Same `MOLIT_API_KEY`
- Endpoint: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo`
- Used in: Cron `/api/cron/enrich-complexes`

**REB (Korea Real Estate Board) - Price Index:**
- Purpose: Apartment trade/jeonse price indices by city/province
- SDK/Client: `src/lib/api/reb.ts`
- Auth: `REB_API_KEY`
- Endpoint: `https://www.reb.or.kr/r-one/openapi/getSidoAptTradeIndex` and `getSidoAptJeonseIndex`
- Response format: XML
- Used in: Cron `/api/cron/fetch-reb-index` (weekly, Monday 10:00 UTC)
- Key functions: `fetchAptTradeIndex()`, `fetchAptJeonseIndex()`, `fetchAllIndices()`

### Financial & Economic Data

**ECOS (Bank of Korea Economic Statistics System) - Interest Rates:**
- Purpose: Base rate, CD 91-day, Treasury 3-year, COFIX rates
- SDK/Client: `src/lib/api/ecos.ts`
- Auth: `ECOS_API_KEY`
- Endpoint: `https://ecos.bok.or.kr/api/StatisticSearch/{apiKey}/json/kr/...`
- Response format: JSON
- Used in: Cron `/api/cron/fetch-rates` (daily at 22:00 UTC)
- Stat codes: `722Y001` (base rate), `817Y002` (market rates: CD91, Treasury3Y, COFIX)
- Key function: `fetchAllRates()` returns `EcosRateItem[]` -- parallel fetches with current+previous month fallback

**FinLife (Financial Supervisory Service - Financial Products) - Bank Loan Rates:**
- Purpose: Mortgage loan product rates by bank
- SDK/Client: `src/lib/api/finlife.ts`
- Auth: `FINLIFE_API_KEY`
- Endpoint: `https://finlife.fss.or.kr/finlifeapi/mortgageLoanProductsSearch.json`
- Response format: JSON
- Used in: Cron `/api/cron/fetch-bank-rates` (weekly, Monday 10:00 UTC)
- Key function: `fetchAllMortgageProducts()` with pagination (max 5 pages)
- Helper: `bankNameToRateType()` maps Korean bank names to internal rate type codes

**DART (Financial Supervisory Service - Electronic Disclosure):**
- Purpose: Corporate financial disclosures
- Auth: `DART_API_KEY`
- Status: Key configured in `.env.local.example` but no implementation file found

### Maps & Geocoding

**Kakao Maps:**
- Purpose: Map display and geocoding for apartment complexes
- JavaScript SDK: Loaded client-side in `src/app/layout.tsx`
  - URL: `https://dapi.kakao.com/v2/maps/sdk.js?appkey={key}&autoload=false&libraries=services,clusterer`
  - Auth: `NEXT_PUBLIC_KAKAO_JS_KEY`
- REST API: Server-side geocoding
  - Auth: `KAKAO_REST_KEY`
  - Used in: Cron `/api/cron/geocode-complexes` (daily at 17:00 UTC)

**Kakao Share:**
- Purpose: KakaoTalk feed sharing
- SDK: `https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js` (loaded in layout)
- Implementation: `src/lib/kakao-share.ts`
- Key function: `shareViaKakao({ title, description, imageUrl, url })` with UTM tracking
- Fallback: Opens Kakao Story share URL if SDK not loaded

### News & Media

**Naver Search API - News:**
- Purpose: Korean news search for real estate topics
- SDK/Client: `src/lib/api/naver-news.ts`
- Auth: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- Endpoint: `https://openapi.naver.com/v1/search/news.json`
- Fallback: Google News RSS (`https://news.google.com/rss/search`) when Naver keys unavailable
- Caching: In-memory, 6-hour TTL, max 200 entries
- Used in: Cron `/api/cron/news` and API `/api/news`

### Social Media Publishing

**Instagram Business (via Facebook Graph API):**
- Purpose: Automated card news posting to Instagram
- Two implementations:
  1. `src/lib/api/instagram.ts` - Simple photo posting (Graph API v25.0)
  2. `src/lib/instagram/client.ts` - Full-featured client with carousel support, rate limiting, container polling (Graph API v21.0)
- Auth: `FACEBOOK_PAGE_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID` (or `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`)
- Features:
  - Single photo publishing
  - Carousel (2-10 images) publishing
  - Rate limit checking (25 posts/24h window)
  - Container status polling with configurable retries
- Used in: Cron `/api/cron/post-instagram` (daily at 19:30 UTC)
- Also configured: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_PAGE_ID`

### E-commerce & Affiliate

**Coupang Partners Affiliate API:**
- Purpose: Product search and affiliate deep links for monetization
- SDK/Client: `src/lib/api/coupang.ts`
- Auth: `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, `COUPANG_AF_CODE`
- Endpoint: `https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/products/search`
- Auth method: HMAC-SHA256 signature
- Key functions: `searchProducts(keyword, limit)`, `generateDeepLink(url)`
- Used in: Cron `/api/cron/coupang`, API `/api/coupang/products`
- Caching: `next: { revalidate: 3600 }` on fetch calls

## Data Storage

**Databases:**
- CockroachDB (PostgreSQL-compatible)
  - Connection: `DATABASE_URL`
  - Client: `pg` Pool with custom QueryBuilder (`src/lib/db/client.ts`)
  - Pool: max 5 connections, 30s idle, 10s connect timeout, SSL enabled
  - QueryBuilder mimics Supabase PostgREST API for migration compatibility

**File Storage:**
- Supabase Storage (images/assets only -- no Supabase DB usage)
  - URL: `NEXT_PUBLIC_SUPABASE_URL`
  - Public URL pattern: `{url}/storage/v1/object/public/{bucket}/{path}`
  - Upload: Stub exists in QueryBuilder but warns "requires Supabase client"

**Caching:**
- In-memory: News search results (6h TTL) in `src/lib/api/naver-news.ts`
- Next.js ISR: `fetch` with `revalidate` option
- Cron-based refresh: `/api/cron/refresh-cache`
- No external cache service (Redis, Memcached, etc.)

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (primary)
  - Client SDK: `src/lib/firebase/config.ts` -- exports `auth` (Auth) and `db` (Firestore)
  - Admin SDK: `src/lib/firebase/admin.ts` -- exports `getAdminAuth()` for server-side token verification
  - Service account: `FIREBASE_ADMIN_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_KEY` env var (JSON)
  - Graceful degradation: Both client and admin SDKs handle missing config without crashing
  - UI: `src/components/auth/UserMenu.tsx`, `src/components/providers/AuthProvider.tsx`
  - Firestore: Used for real-time comments/user-generated content

**Authorization:**
- Admin check: `src/lib/admin/auth.ts` -- `isAdmin(email)` checks against `NEXT_PUBLIC_ADMIN_EMAILS` comma-separated list
- Cron protection: `CRON_SECRET` token in request headers
- Admin dashboard: `/dam/*` routes behind Firebase auth + admin email check

## Monitoring & Observability

**Error Tracking:**
- Slack Webhooks: `src/lib/alert.ts` -- `sendSlackAlert(message)` sends to `SLACK_WEBHOOK_URL`
  - Prefix: `[donjup]` prepended to all messages
  - Graceful: Silently fails if webhook URL not configured

**Analytics:**
- Google Analytics 4 (GA4)
  - ID: `NEXT_PUBLIC_GA_ID`
  - Client: gtag.js loaded in `src/app/layout.tsx` via `afterInteractive` strategy
  - Custom events: `src/lib/analytics/events.ts` -- `trackEvent()`, `trackSearch()`, etc.
  - UTM tracking: `src/lib/analytics/utm.ts`, `src/components/analytics/UTMTracker.tsx`
- Google AdSense: `NEXT_PUBLIC_ADSENSE_ID` -- ad script loaded in layout head

**Logs:**
- Console-based (`console.log`, `console.error`, `console.warn`)
- DB errors enriched with SQL + params in `src/lib/db/client.ts`
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Primary: Vercel
  - Project: `arbadas-projects-fdc12d41/donjup`
  - Domains: `donjup.com`, `www.donjup.com`
  - Deploy: `npx vercel --prod --yes` (CLI) or auto-deploy on push to main

**Cron Jobs (Vercel Cron via `vercel.json`):**

| Schedule (UTC) | Endpoint | Purpose |
|---|---|---|
| Daily 20:00-20:40 (5 batches) | `/api/cron/fetch-transactions?batch=0-4` | Apartment sales data (MOLIT) |
| Daily 15:00, 16:00 | `/api/cron/fetch-transactions?type=2,3` | Non-apartment property types |
| Daily 20:05-20:45 (5 batches) | `/api/cron/fetch-rents?batch=0-4` | Rent/lease data |
| Daily 21:50 | `/api/cron/enrich-complexes` | Building ledger enrichment |
| Weekly Mon 10:00 | `/api/cron/fetch-reb-index` | REB price index |
| Weekly Mon 10:00 | `/api/cron/fetch-bank-rates` | Bank mortgage rates (FinLife) |
| Daily 22:00 | `/api/cron/fetch-rates` | Interest rates (ECOS) |
| Daily 22:50 | `/api/cron/validate-data` | Data validation |
| Daily 23:00 | `/api/cron/generate-report` | Daily report generation |
| Daily 19:00 | `/api/cron/generate-cardnews` | Card news image generation |
| Daily 23:05 | `/api/cron/send-push` | Push notifications |
| Daily 23:30 | `/api/cron/generate-seeding` | Seeding data generation |
| Daily 19:30 | `/api/cron/post-instagram` | Instagram auto-posting |
| Daily 17:00 | `/api/cron/geocode-complexes` | Batch geocoding (Kakao) |

## Environment Configuration

**Required env vars (from `.env.local.example`):**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | CockroachDB PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase storage endpoint |
| `MOLIT_API_KEY` | Ministry of Land API |
| `ECOS_API_KEY` | Bank of Korea statistics |
| `REB_API_KEY` | Korea Real Estate Board |
| `DART_API_KEY` | Financial disclosure (DART) |
| `FINLIFE_API_KEY` | Financial product rates |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase client |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase client |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase client |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | Kakao Maps JS SDK |
| `KAKAO_REST_KEY` | Kakao REST API (geocoding) |
| `CRON_SECRET` | Vercel Cron authentication |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 |
| `NEXT_PUBLIC_ADSENSE_ID` | Google AdSense |
| `COUPANG_ACCESS_KEY` | Coupang affiliate |
| `COUPANG_SECRET_KEY` | Coupang affiliate |
| `COUPANG_AF_CODE` | Coupang affiliate code |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push (public) |
| `VAPID_PRIVATE_KEY` | Web Push (private) |
| `NAVER_CLIENT_ID` | Naver search API |
| `NAVER_CLIENT_SECRET` | Naver search API |
| `SLACK_WEBHOOK_URL` | Error notifications |
| `FACEBOOK_APP_ID` | Facebook app |
| `FACEBOOK_APP_SECRET` | Facebook app |
| `FACEBOOK_PAGE_ID` | Facebook page |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Facebook/Instagram posting |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram account |

**Secrets location:**
- Production: Vercel project environment variables
- Development: `.env.local` (git-ignored)
- Template: `.env.local.example` (committed)

## Webhooks & Callbacks

**Incoming:**
- `/api/cron/*` (23 endpoints) - Vercel Cron scheduler triggers
- `/api/push/subscribe` - PWA push subscription registration
- `/api/analytics/pageview` - Custom pageview tracking

**Outgoing:**
- Instagram Graph API - Photo/carousel publishing
- Slack Webhook - Error/status alerts
- Web Push Protocol - Browser push notifications to subscribers

---

*Integration audit: 2026-03-26*
