# Phase 22: URL 구조 개편 - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

아파트 상세 페이지가 govtComplexId 기반의 안정적인 canonical URL(`/apt/[govtComplexId]`)을 가지고, 기존 `/apt/[region]/[slug]` URL은 308 리다이렉트되며, 모든 내부 링크와 sitemap이 새 URL 체계로 전환된다.

</domain>

<decisions>
## Implementation Decisions

### 새 URL 형식
- **D-01:** 새 URL은 `/apt/[govtComplexId]` 형식. region 제거하고 govtComplexId만으로 단순화. 페이지에서 region 정보는 DB에서 조회.
- **D-02:** 기존 `/apt/[region]/[slug]` 라우트 폴더는 리다이렉트 전용으로 전환 후 제거 가능.

### 리다이렉트 전략
- **D-03:** Next.js middleware에서 기존 `/apt/[region]/[slug]` 패턴을 감지하여 새 URL로 308 Permanent Redirect.
- **D-04:** HTTP 상태 코드 308 사용 (메서드 보존 + 영구 리다이렉트). 검색엔진이 새 URL로 인덱스 이전.

### null govtComplexId 처리
- **D-05:** govtComplexId가 null인 단지는 MOLIT API로 백필하여 null 0건으로 만든 후 통일된 URL 체계 적용. 한글 slug fallback 불필요.
- **D-06:** 백필은 크론잡 또는 일회성 스크립트로 실행.

### 내부 링크 마이그레이션
- **D-07:** RankingTabs, today, new-highs, themes, profile, sitemap, KakaoShare 등 모든 내부 링크를 일괄 전환.
- **D-08:** DB 쿼리에 govtComplexId 필드 추가 + `aptUrl(complex)` 중앙 유틸 함수로 URL 생성 로직 집중. URL 형식 변경 시 한 곳만 수정.

### Claude's Discretion
- middleware에서 slug→govtComplexId 매핑 방식 (DB 조회 vs 패턴 매칭)
- `aptUrl()` 함수의 인터페이스 설계
- 백필 스크립트의 구체적 구현 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### URL 구조
- `src/lib/apt-url.ts` — 현재 toUrlSlug, toDbSlug, makeSlug 함수 정의. 새 aptUrl() 함수 추가 대상
- `src/app/apt/[region]/[slug]/page.tsx` — 현재 아파트 상세 페이지. 리다이렉트 대상
- `src/app/apt/sitemap.ts` — 현재 sitemap 생성. URL 형식 변경 필요

### DB 스키마
- `src/lib/db/schema/apt-complexes.ts` — govtComplexId 필드 정의 (nullable unique)

### 내부 링크 파일
- `src/components/home/RankingTabs.tsx` — `/apt/${region}/${slug}` 링크
- `src/app/today/page.tsx` — `/apt/${region}/${slug}` 링크 + KakaoShare URL
- `src/app/new-highs/page.tsx` — 아파트 링크
- `src/app/themes/[slug]/page.tsx` — 아파트 링크
- `src/app/profile/page.tsx` — `/apt/${f.slug}` (region 없이 — 이미 깨진 상태)
- `src/lib/kakao-share.ts` — 공유 URL 생성

### Requirements
- `.planning/REQUIREMENTS.md` — URL-01 ~ URL-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/apt-url.ts`: toUrlSlug, toDbSlug, makeSlug 함수 — aptUrl() 추가 가능
- `src/lib/db/schema/apt-complexes.ts`: govtComplexId 필드 이미 정의됨 (nullable)
- Drizzle ORM: 모든 DB 접근이 Drizzle로 통일되어 쿼리 수정 용이

### Established Patterns
- Next.js App Router 파일 기반 라우팅
- DB 조회: `import { db } from '@/lib/db'` 단일 진입점
- 링크 생성: 각 페이지에서 직접 템플릿 리터럴로 URL 구성 (중앙화 안 됨)

### Integration Points
- `src/app/apt/[govtComplexId]/page.tsx` — 새 라우트 생성 필요
- `middleware.ts` — 리다이렉트 로직 추가 (파일 존재 여부 확인 필요)
- Profile 페이지: 현재 `/apt/${f.slug}` — region 없이 사용 중이라 이미 깨진 상태

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-url*
*Context gathered: 2026-04-03*
