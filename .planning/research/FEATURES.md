# Feature Landscape: v1.3 서비스 품질 개선

**Domain:** Korean real estate data platform (부동산 데이터 플랫폼)
**Researched:** 2026-03-30
**Scope:** Design system, price display, URL structure, cardnews/Instagram pipeline

---

## Existing Codebase Reality (pre-research audit)

Before mapping the ecosystem, auditing the actual codebase reveals the current state:

### Price Formatting (lib/format.ts)
- `formatPrice(priceInManWon)` — already exists: outputs `8억 5,000만` or `8억`
- `formatKrw(won)` — raw won → `8억원` or `5,000만원`
- Both functions exist but are NOT consistently used across all components (hardcoded strings exist in chart labels, rankings, etc.)

### Design System (globals.css)
- CSS variable system already defined: `--color-surface-*`, `--color-text-*`, `--color-semantic-*`
- Dark mode via `[data-theme="dark"]` attribute already defined with full variable overrides
- Utility classes already exist: `.t-card`, `.t-text`, `.t-drop`, `.t-rise`, etc.
- Problem: components use hardcoded Tailwind colors (`text-red-500`, `bg-white`) AND inline `style={{color: '#ef4444'}}` instead of these variables
- Tailwind `@theme inline` block exposes static color aliases but NOT the dynamic CSS variables

### URL Structure (app/apt/)
- Current: `/apt/[region]/[slug]` where slug is DB-stored string (e.g., `11110-은평자이`)
- `aptSeq` exists in the DB schema but is NOT used in URLs
- No centralized `makeSlug()` utility — slug construction is scattered
- Sitemap at `app/apt/sitemap.ts` is incomplete

### Cardnews Pipeline
- Image generation: `lib/cardnews/render.ts` uses `next/og` ImageResponse — generates Buffer in memory, 1080x1080 px
- Storage: TODO comment in `generate-cardnews/route.ts` — `storageUrls = []` always empty
- Instagram client: `lib/instagram/client.ts` fully implemented (publishPhoto, publishCarousel, getRemainingQuota)
- Blocker: `content_queue.storage_urls` is always empty → `post-instagram` route skips posting with "No image URLs"

---

## Korean Real Estate Platform Conventions (Ecosystem Research)

### 1. Price Display Format — Industry Standard

**Findings from competitor analysis (호갱노노, 아실, 부동산지인, 네이버부동산):**

| Platform | Format Used | Example |
|----------|-------------|---------|
| 호갱노노 | 억 단위 + 소숫점 없음 | `9억 8,000만` |
| 아실 | 억원/만원 혼용 | `1,500만원` / `5.2억원` |
| 부동산지인 | 억원 (소숫점 1자리, 테이블용) | `5.2억원` |
| 네이버부동산 | 만원 단위 내부저장, 표시는 억/만 혼용 | `9억 8,000만` |
| 돈줍 현재 | `formatPrice()` 존재하지만 미적용 부분 있음 | `8억 5,000만` or `8억` |

**Industry consensus:**
- 1억 이상: `N억` or `N억 M,000만` (천 단위 콤마 포함)
- 1억 미만: `N,000만` (콤마 포함)
- 소숫점 억 표시 (`5.2억`)는 테이블 공간이 좁을 때만 허용 — 주요 표시에는 미사용
- 주요 플랫폼은 차트 축에서 `억` 단위 축약 사용 (`8억`, `9억`, `10억`)
- Confidence: MEDIUM (cross-platform observation + official crawling docs)

**Gap in donjup:** `formatPrice()` exists and is correct. The problem is inconsistent usage — some places call it, others use raw number formatting, Recharts `tickFormatter` bypasses it.

### 2. URL Structure — Industry Standard

**Findings:**

| Platform | URL Pattern | Identifier Type |
|----------|-------------|-----------------|
| 호갱노노 | `/apt/{alphanumeric_id}` | Opaque internal ID (e.g., `e1u54`, `fulbc`) — NOT human-readable |
| 아실 | `/app/apt_info.jsp?apt={aptID}` | Query parameter, JSP-based |
| 부동산지인 | `/home/gin02/gin0201/apt/{pk_bi_ent_view}` | Numeric internal key |
| 직방 | `/home/apartment/complexes/{id}` | Numeric complex ID |
| 돈줍 현재 | `/apt/[region]/[slug]` | Text slug from DB |

**Key insight:** No Korean real estate platform uses human-readable slugs. They all use opaque or numeric IDs. SEO value is delivered via rich page metadata (OGP, structured data), not URL text.

**`aptSeq` hybrid approach:** Using `/apt/[region]/[aptSeq]-[name-slug]` gives:
- Stable canonical ID (no duplicate slug collisions across regions)
- Human-readable context in URL (name still visible)
- Simpler `makeSlug()` central function
- Better for Sitemap generation (enumerate by aptSeq)

**Confidence:** HIGH for competitor patterns (direct URL observation). MEDIUM for SEO impact.

### 3. Design System — Industry Conventions

**Findings from hogangnono.com (CSS inspection):**
- Primary color: `#584de4` (purple) — strong brand identity
- Semantic colors: Red `#ef5a5a`, Green `#00BD58`, Blue `#0651F1`
- NO dark mode — hogangnono has no dark mode in 2026
- Font: Pretendard (same as donjup)
- Mobile-first with SafeArea insets

**Industry pattern:**
- Korean real estate apps are predominantly light-mode only
- No major competitor has dark mode as of 2026
- Donjup's dark mode is a **differentiator**, not table stakes
- A half-broken dark mode is worse UX than no dark mode

**Tailwind CSS v4 dark mode root cause (from official docs — HIGH confidence):**
- `[data-theme="dark"]` CSS approach already defined in globals.css is correct
- But to use `dark:` utility classes (e.g., `dark:text-white`), you MUST add to globals.css:
  ```css
  @custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
  ```
- This declaration is MISSING from donjup's globals.css
- Without it, `dark:text-white` never applies — only manual `[data-theme="dark"] .t-*` CSS works
- This is the root cause of partial dark mode: components using Tailwind `dark:` utilities are broken

### 4. Cardnews / Social Media Auto-Posting

**Industry findings:**
No Korean real estate competitor (호갱노노, 아실, 직방, 네이버부동산) publicly auto-posts daily data cardnews to Instagram. This is a **differentiator**, not table stakes.

**2025 Instagram platform data (Meta official docs — HIGH confidence):**
- Carousels: 2-10 images, all cropped to first image aspect ratio (1:1 recommended)
- Rate limit: 100 API-published posts per 24h rolling window (updated March 2025, previously 25)
- Image requirements: publicly accessible HTTPS URL at time of API call — Buffer not accepted
- Publishing flow: create container → wait for FINISHED status → publish

**The specific blocker in donjup:**
1. `generateCardNews()` returns `Buffer[]` in memory — never stored
2. `storageUrls` in content_queue is always `[]`
3. Instagram API requires public HTTPS URLs — cannot use in-memory Buffer

**Storage options for image hosting:**

| Option | Free Tier | Complexity | Fit |
|--------|-----------|------------|-----|
| Vercel Blob | Shared with project quota | Low | Best — already on Vercel, `@vercel/blob` SDK |
| Firebase Storage | 5GB free (Firebase already in stack) | Low | Good — already authenticated |
| Cloudinary | 25 credits/month, 25GB bandwidth | Medium | External dependency |
| AWS S3 | Pay-per-use | High | Overkill |

**Recommendation: Vercel Blob**
- Already in Vercel ecosystem
- `@vercel/blob` npm package, server-side `put()` function
- Client upload: no data transfer charges
- Server upload: incurs Fast Data Transfer charges (minor for 5 images/post)
- Free tier: sufficient for ~260MB/year at 5 images × 5 days × 52 weeks × ~200KB
- Single env var: `BLOB_READ_WRITE_TOKEN` (added in Vercel dashboard)

**Confidence:** HIGH for Vercel Blob fit. HIGH for Instagram API requirements.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Consistent price format (억/만 throughout) | Industry standard — every Korean real estate site uses this | Low | `formatPrice()` exists; propagation work needed |
| Working dark mode end-to-end | Users who toggle dark mode expect it everywhere | Medium | Root cause: missing `@custom-variant dark` — one-line CSS fix + component migration |
| No "0" or blank where data is null | Basic data display quality | Low | Standardize null → `-` or `데이터 없음` |
| Consistent area units (평/㎡) | Users expect consistent unit per context | Low | `formatSizeWithPyeong()` exists; usage audit needed |
| Stable apartment URLs (no 404 after updates) | Bookmarks, sharing, SEO | Medium | aptSeq-based URLs prevent slug collision |

## Differentiators

Features that set donjup apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Daily cardnews auto-posting to Instagram | Zero Korean competitors do this | Medium | Pipeline 90% done; only storage integration missing |
| Functional dark mode (competitors lack it entirely) | Premium UX in a dark-mode-free landscape | Medium | CSS fix + component sweep |
| aptSeq-canonical URLs + complete Sitemap | Long-tail SEO for 50K+ apartments | Low | One-time migration with 301 redirects |
| Centralized `makeSlug()` | Developer ergonomics; prevents future slug drift | Low | Single utility function |

## Anti-Features

Features to explicitly NOT build in v1.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Human-readable slug-only URLs (no ID) | Korean competitors don't use; duplicate collision risk | aptSeq + compact slug hybrid |
| Full UI redesign | Out of scope (PROJECT.md: "v3 마일스톤") | Token-level consistency only |
| Instagram Reels / video generation | High complexity, no data format benefit | Keep carousel (static images) |
| Third-party storage (AWS S3, Cloudinary) | Adds vendor dependency + cost | Vercel Blob or Firebase Storage |
| Rebuilding dark mode from scratch | System already defined correctly | Fix @custom-variant + migrate components |
| Adding brand new chart types | v1.3 is quality, not new features | Improve existing chart legends only |

## Feature Dependencies

```
Dark Mode Fix:
  globals.css: add @custom-variant dark
    → Tailwind dark: utilities activate
      → Component migration: replace hardcoded colors with dark: utilities or .t-* classes

Price Format Normalization:
  Audit all chart tickFormatter, ranking displays, detail pages
    → Replace with formatPrice() / formatKrw()
      → Standardize null/"0" display rules

Cardnews Instagram Pipeline:
  npm install @vercel/blob + BLOB_READ_WRITE_TOKEN env var
    → generate-cardnews: upload Buffer[] to Vercel Blob → store public URLs
      → content_queue.storage_urls populated
        → post-instagram route: imageUrls.length > 0 → publishCarousel() executes

URL Structure:
  Confirm aptSeq in apt_complexes schema
    → Centralize makeSlug(aptSeq, name) utility
      → Update /apt/[region]/[slug] routes to /apt/[region]/[aptSeq]-[slug]
        → Add 301 redirects for old URL format
          → Regenerate Sitemap
```

## MVP Recommendation for v1.3

Ordered by dependency + user impact:

1. **globals.css: add `@custom-variant dark`** — single line, unblocks all `dark:` utilities (Low complexity, high leverage)
2. **Hardcoded color migration** — sweep components, replace inline style and hardcoded Tailwind colors with `.t-*` classes (Medium complexity, High visual impact)
3. **Price format audit** — ensure `formatPrice()` used in all chart formatters, ranking rows, null handling (Low complexity, High data quality)
4. **Vercel Blob storage** — 30-minute integration that unblocks the entire Instagram pipeline (Low complexity, enables differentiator)
5. **aptSeq URL + makeSlug + Sitemap** — SEO foundation, no user-facing visual change (Medium complexity, Long-term SEO value)

Defer to v1.3.x or later:
- Chart legend improvements — cosmetic
- Profile link fixes — minor
- Search result enhancements — requires data changes

---

## Sources

- [Instagram Graph API — Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/) — HIGH confidence (official Meta docs)
- [Vercel Blob Pricing & Limits](https://vercel.com/docs/vercel-blob/usage-and-pricing) — HIGH confidence (official Vercel docs)
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) — HIGH confidence (official Tailwind docs)
- [호갱노노 URL pattern](https://hogangnono.com/apt/e1u54) — MEDIUM confidence (direct URL observation)
- [아실 URL pattern](https://asil.kr/asil/sub/movein.jsp) — MEDIUM confidence (direct inspection)
- [부동산지인 URL/price](https://aptgin.com) — MEDIUM confidence (page content extraction)
- [네이버부동산 API/price format](https://financedata.github.io/posts/naver-land-crawling.html) — MEDIUM confidence (community crawling guide)
- Donjup codebase audit (`src/lib/format.ts`, `src/app/globals.css`, `src/lib/cardnews/render.ts`, `src/lib/instagram/client.ts`) — HIGH confidence (direct inspection)
