# Phase 22: URL 구조 개편 - Research

**Researched:** 2026-04-03
**Domain:** Next.js 16 App Router routing, proxy.ts redirects, Drizzle ORM, URL migration
**Confidence:** HIGH

## Summary

Phase 22는 아파트 상세 페이지 URL을 `/apt/[region]/[slug]` 에서 `/apt/[govtComplexId]`로 변경하고, 기존 URL은 308 영구 리다이렉트로 처리하는 작업이다. 프로젝트는 Next.js 16.2.1을 사용하며, 이 버전에서 `middleware.ts`는 **deprecated**되고 `proxy.ts`로 이름이 바뀌었다. 현재 `src/proxy.ts`가 이미 존재하며 API 경로 처리만 담당 중이다.

리다이렉트 구현은 `src/proxy.ts`의 matcher를 `/apt/:region/:slug*` 패턴으로 확장하고 `NextResponse.redirect(new URL('/apt/${govtComplexId}', request.url), 308)`를 반환하는 방식으로 처리한다. 단, proxy.ts는 Edge/Node 경량 환경이라 DB 조회가 가능하나 cold start 비용 고려가 필요하다. slug에서 govtComplexId를 찾는 방법은 DB 조회(정확) 또는 패턴 매칭(slug가 이미 `{regionCode}-{aptSeq}` 형태) 두 가지다.

`govtComplexId`가 null인 단지는 D-05에 따라 MOLIT API 백필로 0건으로 만든 후 통일된 URL 체계를 적용한다. 내부 링크는 7개 파일에 분산되어 있으며, 모두 `aptUrl(complex)` 중앙 유틸로 교체한다.

**Primary recommendation:** proxy.ts에 `/apt/:region/:slug*` matcher를 추가하고 DB 조회로 govtComplexId 확인 후 308 리다이렉트. 새 `/apt/[govtComplexId]/page.tsx` 라우트는 govtComplexId 기반으로 DB 조회. `aptUrl()` 함수를 `src/lib/apt-url.ts`에 추가하고 모든 내부 링크를 교체.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 새 URL은 `/apt/[govtComplexId]` 형식. region 제거하고 govtComplexId만으로 단순화. 페이지에서 region 정보는 DB에서 조회.
- **D-02:** 기존 `/apt/[region]/[slug]` 라우트 폴더는 리다이렉트 전용으로 전환 후 제거 가능.
- **D-03:** Next.js middleware(proxy.ts)에서 기존 `/apt/[region]/[slug]` 패턴을 감지하여 새 URL로 308 Permanent Redirect.
- **D-04:** HTTP 상태 코드 308 사용 (메서드 보존 + 영구 리다이렉트). 검색엔진이 새 URL로 인덱스 이전.
- **D-05:** govtComplexId가 null인 단지는 MOLIT API로 백필하여 null 0건으로 만든 후 통일된 URL 체계 적용. 한글 slug fallback 불필요.
- **D-06:** 백필은 크론잡 또는 일회성 스크립트로 실행.
- **D-07:** RankingTabs, today, new-highs, themes, profile, sitemap, KakaoShare 등 모든 내부 링크를 일괄 전환.
- **D-08:** DB 쿼리에 govtComplexId 필드 추가 + `aptUrl(complex)` 중앙 유틸 함수로 URL 생성 로직 집중.

### Claude's Discretion
- middleware(proxy.ts)에서 slug→govtComplexId 매핑 방식 (DB 조회 vs 패턴 매칭)
- `aptUrl()` 함수의 인터페이스 설계
- 백필 스크립트의 구체적 구현 방식

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| URL-01 | 아파트 상세 페이지 URL이 govtComplexId(aptSeq) 기반으로 변환된다 | 새 `/apt/[govtComplexId]/page.tsx` 라우트 + aptComplexes.govtComplexId 컬럼 기반 DB 조회 |
| URL-02 | 기존 `/apt/[region]/[slug]` URL이 새 URL로 308 리다이렉트된다 | proxy.ts에 matcher 추가 + NextResponse.redirect with 308 |
| URL-03 | makeSlug 함수가 단일 유틸 모듈(`lib/apt-url.ts`)로 중앙화된다 | toSlug 로컬 정의(fetch-transactions/route.ts) 제거, makeSlug는 이미 apt-url.ts에 있음 |
| URL-04 | Sitemap에 모든 아파트 상세 페이지가 포함된다 | sitemap.ts를 govtComplexId 기반으로 업데이트, null인 단지는 백필 후 포함 |
| URL-05 | Profile 페이지의 아파트 링크가 정상 동작한다 | FavoriteButton이 저장하는 slug를 govtComplexId로 교체 필요 |
| URL-06 | govtComplexId가 null인 단지에 대해 백필이 완료된다 | 크론잡 또는 일회성 스크립트로 MOLIT API 백필 |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | App Router, proxy.ts, permanentRedirect | 이미 사용 중 |
| drizzle-orm | ^0.45.2 | DB 쿼리 (govtComplexId 조회) | 이미 사용 중 |
| next/server | (built-in) | NextRequest, NextResponse.redirect | proxy.ts에서 사용 |

### Key API Facts (Next.js 16)

**CRITICAL:** `middleware.ts`는 Next.js 16에서 deprecated. 파일명은 `proxy.ts`, 함수명은 `proxy()`로 변경.

현재 `src/proxy.ts`가 존재하며 matcher가 `/api/:path*`만 커버 중. `/apt/:region/:slug*` 매처 추가 필요.

```typescript
// Next.js 16 - proxy.ts 패턴
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // redirect logic
}

export const config = {
  matcher: ["/api/:path*", "/apt/:region/:slug*"],
};
```

**Installation:** 추가 패키지 불필요 — 모두 기존 스택.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── apt/
│   │   ├── [govtComplexId]/     # 새 라우트 (NEW)
│   │   │   ├── page.tsx         # 새 상세 페이지
│   │   │   └── opengraph-image.tsx
│   │   ├── [region]/
│   │   │   └── [slug]/
│   │   │       └── page.tsx     # 308 리다이렉트만 (또는 삭제)
│   │   └── sitemap.ts           # govtComplexId 기반으로 업데이트
│   └── api/
│       └── cron/
│           └── backfill-govt-id/ # 백필 크론 (NEW, optional)
├── lib/
│   └── apt-url.ts               # aptUrl() 함수 추가 (기존 파일 확장)
└── proxy.ts                     # 리다이렉트 로직 추가
```

### Pattern 1: proxy.ts 308 리다이렉트

**슬러그 → govtComplexId 매핑 방식 결정 (Claude's Discretion):**

**옵션 A: 패턴 매칭 (DB 조회 없음)**

현재 slug 형태를 분석하면:
- `{aptSeq}` (예: `164`) — toDbSlug가 `{regionCode}-{aptSeq}` = govtComplexId로 복원 가능
- 한글 slug (예: `서해그랑블5단지`) — govtComplexId 없음, 백필 필요

slug가 숫자이면 `/apt/${region}-${slug}` 가 govtComplexId. DB 조회 없이 변환 가능.

```typescript
// Source: proxy.ts docs (Next.js 16)
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // /apt/{region}/{slug} 패턴 감지
  const aptMatch = pathname.match(/^\/apt\/([^/]+)\/([^/]+)$/);
  if (aptMatch) {
    const [, region, slug] = aptMatch;
    // 숫자 slug → govtComplexId 패턴
    if (/^\d+$/.test(slug)) {
      const govtComplexId = `${region}-${slug}`;
      return NextResponse.redirect(
        new URL(`/apt/${govtComplexId}`, request.url),
        308
      );
    }
    // 한글 slug → 새 페이지에서 fallback 처리 또는 404
    // govtComplexId 백필 완료 후에는 이 케이스 없음
  }
  return NextResponse.next();
}
```

**옵션 B: DB 조회**

proxy.ts에서 DB 조회 가능하나 cold start + CockroachDB latency 고려. 모든 케이스 처리 가능.

**권장:** 옵션 A (패턴 매칭) — D-05에서 govtComplexId null 0건 달성 후에는 한글 slug가 존재하지 않음. 백필 완료 전 한글 slug는 새 페이지에서 slug 기반 fallback 처리하거나 404.

### Pattern 2: aptUrl() 유틸 함수 설계

```typescript
// src/lib/apt-url.ts에 추가
interface AptUrlInput {
  govtComplexId: string | null;
  regionCode: string;
  slug: string; // DB slug (fallback용)
}

export function aptUrl(complex: AptUrlInput): string {
  if (complex.govtComplexId) {
    return `/apt/${complex.govtComplexId}`;
  }
  // govtComplexId 없는 단지 (백필 전) — 기존 URL fallback
  return `/apt/${complex.regionCode}/${toUrlSlug(complex.regionCode, complex.slug)}`;
}
```

**D-08 핵심:** 이 함수 하나만 변경하면 전체 URL 형식 변경 가능.

### Pattern 3: 새 라우트 페이지 (govtComplexId 기반 조회)

```typescript
// src/app/apt/[govtComplexId]/page.tsx
export default async function AptDetailPage({
  params,
}: {
  params: Promise<{ govtComplexId: string }>;
}) {
  const { govtComplexId } = await params;
  const complex = await db
    .select()
    .from(aptComplexes)
    .where(eq(aptComplexes.govtComplexId, govtComplexId))
    .limit(1);
  if (!complex[0]) notFound();
  // ...
}
```

### Pattern 4: sitemap.ts 업데이트

```typescript
// govtComplexId가 있는 단지만 포함 (null인 경우 백필 후)
const complexes = await db.select({
  govtComplexId: aptComplexes.govtComplexId,
}).from(aptComplexes)
  .where(isNotNull(aptComplexes.govtComplexId))
  .orderBy(asc(aptComplexes.id))
  .offset(offset)
  .limit(ITEMS_PER_SITEMAP);

return complexes.map((c) => ({
  url: `${baseUrl}/apt/${c.govtComplexId}`,
  // ...
}));
```

### Pattern 5: Profile 페이지 favorites localStorage 이슈

`FavoriteButton` 컴포넌트가 slug를 저장 중. Profile 페이지는 `href={/apt/${f.slug}}`로 region 없이 사용 — 이미 깨진 상태(CONTEXT.md 확인).

**해결:** FavoriteButton에서 저장 구조를 `{ govtComplexId, aptName, regionName }` 형태로 변경. 기존 localStorage 항목(slug 기반)은 새 URL 형식과 호환되지 않으므로 마이그레이션 필요.

### Anti-Patterns to Avoid

- **proxy.ts에서 DB 조회 남용:** cold start 시 CockroachDB 연결 비용. 패턴 매칭으로 처리 가능한 경우 DB 우회.
- **기존 `/apt/[region]/[slug]/page.tsx` 즉시 삭제:** 구글 크롤러가 308을 따라가기 전까지 기존 URL이 살아있어야 함. proxy.ts 리다이렉트 배포 후 페이지 제거.
- **`middleware.ts` 파일 생성:** Next.js 16에서 deprecated. 반드시 `proxy.ts` 사용.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 308 리다이렉트 | 직접 HTTP 응답 구성 | `NextResponse.redirect(url, 308)` | Next.js 공식 API |
| 상세 페이지 308 | `permanentRedirect()` in page.tsx | proxy.ts 레벨 처리 | 페이지 렌더링 전 처리로 DB 쿼리 절약 |
| 내부 링크 URL 생성 | 각 페이지에서 템플릿 리터럴 | `aptUrl(complex)` 중앙 함수 | D-08 요구사항 |

**Key insight:** proxy.ts는 렌더링 전에 실행되어 DB 쿼리 없이 패턴 매칭으로 처리 가능한 경우 가장 효율적.

## Runtime State Inventory

> 리다이렉트/URL 변경이지만 DB 컬럼 기반이라 런타임 상태 확인 필요.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `apt_complexes.govt_complex_id` — nullable unique, 이미 컬럼 존재 | 백필 스크립트로 null 건수 제거 |
| Stored data | localStorage `donjup-favorites` — slug 기반으로 저장됨 | FavoriteButton 저장 구조를 govtComplexId로 변경 + localStorage 기존 항목 처리 |
| Live service config | Vercel 배포 — sitemap URL 변경 후 Google Search Console 재크롤 요청 | 배포 후 GSC에서 URL 검사 요청 (수동) |
| OS-registered state | None — 서버리스 환경 | None |
| Secrets/env vars | None — URL 구조 변경만 | None |
| Build artifacts | None | None |

**govtComplexId null 현황:** STATE.md에서 "5% 초과 시 backfill migration 선행 필요" 언급. `SELECT COUNT(*) FROM apt_complexes WHERE govt_complex_id IS NULL` 쿼리를 Wave 0에서 실행해야 함.

**fetch-transactions/route.ts의 `toSlug` 로컬 정의:** line 333에 makeSlug와 동일한 함수가 중복 정의되어 있음. URL-03(makeSlug 중앙화) 준수를 위해 이 로컬 함수를 `src/lib/apt-url.ts`의 makeSlug로 교체 필요.

## Common Pitfalls

### Pitfall 1: Next.js 16에서 middleware.ts vs proxy.ts 혼동
**What goes wrong:** `middleware.ts` 파일을 생성하거나 `middleware()` 함수를 사용하면 Next.js 16에서 무시되거나 경고 발생
**Why it happens:** Next.js 16.0.0에서 middleware가 proxy로 rename됨
**How to avoid:** 반드시 `src/proxy.ts`에 `export function proxy()` 사용
**Warning signs:** 리다이렉트가 동작하지 않을 때 파일명/함수명 확인

### Pitfall 2: proxy.ts matcher 배열에서 기존 설정 유실
**What goes wrong:** 기존 `/api/:path*` matcher를 새 `/apt/:region/:slug*` 추가 시 덮어쓰면 API 경로 proxy 로직 손실
**Why it happens:** config.matcher는 배열 전체를 교체함
**How to avoid:** 배열에 두 패턴 모두 포함: `matcher: ["/api/:path*", "/apt/:region/:slug*"]`

### Pitfall 3: [govtComplexId] 라우트와 [region] 라우트 충돌
**What goes wrong:** `/apt/11230` (govtComplexId) vs `/apt/11230` (region code) — 같은 경로 세그먼트
**Why it happens:** 두 dynamic segment가 같은 depth에 있으면 Next.js가 파일시스템 순서로 하나만 매칭
**How to avoid:** 기존 `/apt/[region]/[slug]`는 2단계(`/apt/11230/164`), 새 `/apt/[govtComplexId]`는 1단계(`/apt/11230-164`). govtComplexId 형태는 `{regionCode}-{aptSeq}` (하이픈 포함) → region code만으로는 매칭 불가능하여 충돌 없음. 단, govtComplexId가 순수 숫자이면 충돌 위험.

현재 govtComplexId 형태 확인: `11230-164` 형식(regionCode-aptSeq 복합). 단순 숫자(aptSeq만)가 아니므로 region code 5자리 숫자와 충돌하지 않음. **단, proxy.ts에서 `/apt/11230-164` 패턴(하이픈 포함)과 `/apt/11230/164` 패턴(슬래시)을 구분해야 함.**

### Pitfall 4: FavoriteButton localStorage 하위 호환성
**What goes wrong:** 기존 저장된 favorites가 `{ slug: "164", aptName: "...", regionName: "..." }` 형태 — 새 URL 형식에서 404
**Why it happens:** localStorage는 서버 배포와 독립적으로 클라이언트에 남아있음
**How to avoid:** Profile 페이지에서 favorites 로드 시 govtComplexId 없는 항목은 slug→govtComplexId 변환 시도 또는 걸러내기. 혹은 FavoriteButton의 저장 키 자체를 govtComplexId 기반으로 변경하고 기존 항목은 무시(자연 소멸).

### Pitfall 5: opengraph-image.tsx 라우트 누락
**What goes wrong:** 새 `/apt/[govtComplexId]/opengraph-image.tsx`를 만들지 않으면 OG 이미지 404
**Why it happens:** 기존 OG 이미지가 `/apt/[region]/[slug]/opengraph-image.tsx`에 있음
**How to avoid:** 새 라우트 생성 시 opengraph-image.tsx도 함께 이동/복사

## Code Examples

### proxy.ts 리다이렉트 추가

```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // /apt/{region}/{slug} → /apt/{govtComplexId} (308)
  const aptMatch = pathname.match(/^\/apt\/(\d{5})\/(.+)$/);
  if (aptMatch) {
    const [, region, slug] = aptMatch;
    const decodedSlug = decodeURIComponent(slug);
    // 숫자 slug = aptSeq → govtComplexId = region-aptSeq
    if (/^\d+$/.test(decodedSlug)) {
      return NextResponse.redirect(
        new URL(`/apt/${region}-${decodedSlug}`, request.url),
        308
      );
    }
    // 한글 slug — 백필 완료 후에는 이 케이스 없어야 함
    // 백필 전 fallback: 새 페이지에서 slug 기반 조회로 처리
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/apt/:region/:slug*"],
};
```

### aptUrl() 유틸 함수

```typescript
// src/lib/apt-url.ts에 추가
export function aptUrl(complex: {
  govtComplexId: string | null;
  regionCode: string;
  slug: string;
}): string {
  if (complex.govtComplexId) {
    return `/apt/${complex.govtComplexId}`;
  }
  // 백필 전 fallback
  return `/apt/${complex.regionCode}/${toUrlSlug(complex.regionCode, complex.slug)}`;
}
```

### 내부 링크 교체 패턴

```typescript
// 변경 전 (RankingTabs, today, new-highs, themes 등)
href={`/apt/${t.region_code}/${slug}`}

// 변경 후 (govtComplexId 필드 DB 쿼리에 추가 필요)
href={aptUrl({ govtComplexId: t.govt_complex_id, regionCode: t.region_code, slug: t.complex_slug ?? '' })}
```

**DB 쿼리 변경 필요:** 각 페이지의 select에 `govtComplexId: aptComplexes.govtComplexId` 추가. RankingTabs는 API 응답을 받으므로 cache/API 레이어도 확인 필요.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware()` | `proxy.ts` + `export function proxy()` | Next.js 16.0.0 | 파일명과 함수명 변경 필수 |
| Edge Runtime only | Node.js runtime (stable from v15.5) | Next.js 15.5 | DB 연결 등 Node.js API 사용 가능 |

**Deprecated/outdated:**
- `middleware.ts`: Next.js 16에서 deprecated → `proxy.ts` 사용
- `src/app/api/migrate/route.ts`의 `toSlug` 로컬 정의: apt-url.ts의 makeSlug로 통일 필요

## Open Questions

1. **govtComplexId null 현황**
   - What we know: 컬럼은 존재하고 fetch-transactions가 새 거래 시 업데이트. STATE.md에 5% 기준 언급.
   - What's unclear: 현재 null 건수. 백필 없이 바로 URL 전환 가능한지.
   - Recommendation: Wave 0에서 `SELECT COUNT(*) FROM apt_complexes WHERE govt_complex_id IS NULL` 실행 필수.

2. **slug가 한글인 기존 단지 처리**
   - What we know: 한글 slug는 govtComplexId가 없는 단지용 fallback (현재 makeSlug로 생성).
   - What's unclear: 현재 한글 slug를 가진 단지가 몇 건인지.
   - Recommendation: 백필 완료가 선행 조건(D-05). 백필 전에는 새 페이지에서 slug 컬럼 기반 fallback 조회 유지.

3. **RankingTabs의 govtComplexId 데이터 흐름**
   - What we know: RankingTabs는 `complex_slug`를 홈 API에서 받아 `toUrlSlug`로 변환.
   - What's unclear: 홈 API가 `govt_complex_id`도 반환하는지. 인터페이스 변경 범위.
   - Recommendation: RankingTabs의 Transaction 인터페이스에 `govt_complex_id` 필드 추가, API 응답도 포함하도록 수정.

## Environment Availability

> Step 2.6: SKIPPED — URL 구조 변경은 기존 Next.js/DB 스택만 사용. 외부 도구 의존성 없음.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/unit/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| URL-01 | `/apt/[govtComplexId]` 페이지가 govtComplexId로 DB 조회 | unit | `npx vitest run tests/unit/apt-url.test.ts` | ❌ Wave 0 |
| URL-02 | proxy.ts가 `/apt/[region]/[slug]` → 308 리다이렉트 | unit | `npx vitest run tests/unit/proxy.test.ts` | ❌ Wave 0 |
| URL-03 | makeSlug가 단일 모듈에만 존재 | manual (grep) | `grep -r "\.replace.*가-힣" src/ --include="*.ts"` | N/A |
| URL-04 | sitemap이 govtComplexId URL 반환 | unit | `npx vitest run tests/unit/apt-url.test.ts` | ❌ Wave 0 |
| URL-05 | Profile 링크가 govtComplexId URL 생성 | manual | 브라우저 확인 | N/A |
| URL-06 | govtComplexId null 건수 = 0 | manual (DB query) | `SELECT COUNT(*) FROM apt_complexes WHERE govt_complex_id IS NULL` | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/apt-url.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/apt-url.test.ts` — aptUrl() 함수 단위 테스트
- [ ] `tests/unit/proxy.test.ts` — proxy.ts 리다이렉트 로직 테스트 (Next.js 16 `unstable_doesProxyMatch` 활용 가능)

## Project Constraints (from CLAUDE.md)

- CockroachDB Serverless: `ssl: { rejectUnauthorized: false }` 필수, `ssl: true` 절대 금지
- 서버 컴포넌트에서 자기 API fetch 금지 → db 직접 쿼리 (새 `/apt/[govtComplexId]/page.tsx`에 적용)
- 커밋 → push → `npx vercel --prod --yes` → 라이브 확인

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — proxy.ts API, migration from middleware, NextResponse.redirect
- `node_modules/next/dist/docs/01-app/02-guides/redirecting.md` — 리다이렉트 방법 비교, 308 상태코드
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/permanentRedirect.md` — permanentRedirect API
- `src/proxy.ts` — 기존 proxy.ts 구조
- `src/lib/db/schema/apt-complexes.ts` — govtComplexId 필드 정의
- `src/lib/apt-url.ts` — 현재 URL 유틸 함수
- `src/app/apt/[region]/[slug]/page.tsx` — 마이그레이션 대상 페이지

### Secondary (MEDIUM confidence)
- `src/app/api/cron/fetch-transactions/route.ts` — govtComplexId 생성 로직 + toSlug 중복 정의 확인
- `src/components/home/RankingTabs.tsx`, `src/app/today/page.tsx`, `src/app/new-highs/page.tsx`, `src/app/themes/[slug]/page.tsx` — 내부 링크 현황

### Tertiary (LOW confidence)
- N/A — 모든 핵심 발견은 공식 소스(코드베이스, Next.js docs)로 검증됨

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Next.js 16 공식 docs + 기존 코드베이스 직접 확인
- Architecture: HIGH — 기존 proxy.ts 패턴 + Next.js docs 예제
- Pitfalls: HIGH — 코드베이스 직접 분석으로 발견

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (Next.js 16 stable, 30일)
