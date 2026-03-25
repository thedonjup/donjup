# Roadmap: 돈줍 사이트 안정화

**Created:** 2026-03-26
**Milestone:** v1.0 — 사이트 안정화
**Phases:** 8

## Phase Overview

| # | Phase | Goal | Requirements | Risk |
|---|-------|------|-------------|------|
| 1 | SEO / 메타데이터 수정 | 검색엔진 최적화 치명적 버그 해결 | SEO-01~04 | Low |
| 2 | 코드 정리 (패키지/네이밍) | 미사용 코드 제거, 네이밍 정리 | CLN-01~05 | Low |
| 3 | 컴포넌트 분할 | 대형 파일 서브 컴포넌트로 분할 | CLN-06 | Medium |
| 4 | 에러 핸들링 / 로깅 | 에러 바운더리 + 구조화 로깅 | ERR-01~04 | Low |
| 5 | 성능 최적화 | DB 검색, 커넥션 풀, 크론잡 | PERF-01~04 | Medium |
| 6 | TypeScript 타입 강화 | 핵심 모듈 any 제거, 인터페이스 정의 | TYPE-01~03 | Low |
| 7 | 접근성 (a11y) | ARIA, 키보드 내비, 텍스트 대안 | A11Y-01~04 | Low |
| 8 | 보안 강화 | 인증, CSP, SSL, 환경변수 정리 | SEC-01~06 | Medium |

## Phase Details

### Phase 1: SEO / 메타데이터 수정
**Goal:** 검색엔진이 모든 페이지를 개별적으로 인식하고 적절한 미리보기를 생성한다

**Requirements:** SEO-01, SEO-02, SEO-03, SEO-04

**Scope:**
- canonical URL을 모든 페이지에서 해당 페이지 URL로 수정
- compare, profile, dam 페이지에 고유 title 설정
- 지도 페이지 SSR에서 초기 데이터 포함 또는 의미 있는 콘텐츠 렌더링
- 주요 서브 페이지에 전용 OG Image 생성

**Dependencies:** 없음 (독립적)

**Success Criteria:**
- 모든 페이지의 canonical URL이 자기 자신을 가리킴
- curl로 확인 시 각 페이지 고유 title 존재
- /map SSR HTML에 "데이터가 없습니다" 메시지 없음

---

### Phase 2: 코드 정리 (패키지/네이밍)
**Goal:** 미사용 코드와 혼란스러운 네이밍이 정리되어 유지보수성이 향상된다

**Requirements:** CLN-01, CLN-02, CLN-03, CLN-04, CLN-05

**Scope:**
- KakaoMap.tsx의 로컬 formatPrice 제거, src/lib/format.ts에서 import
- Instagram 클라이언트 통합 (src/lib/api/instagram.ts + src/lib/instagram/client.ts → 하나로)
- 미사용 DB 패키지 제거 (postgres, @neondatabase/serverless)
- src/lib/supabase/ → src/lib/db/로 리네이밍 + 전체 import 경로 업데이트
- Storage stub 제거 또는 적절한 처리

**Dependencies:** 없음

**Success Criteria:**
- `pnpm build` 성공
- grep으로 중복 formatPrice 없음
- package.json에서 미사용 패키지 제거됨
- import '@/lib/supabase' 경로 0건

---

### Phase 3: 컴포넌트 분할
**Goal:** 대형 단일 파일 컴포넌트가 관리 가능한 크기로 분할된다

**Requirements:** CLN-06

**Scope:**
- src/app/rate/calculator/page.tsx (1101줄) → 서브 컴포넌트 분리
- src/components/map/KakaoMap.tsx (640줄) → 서브 컴포넌트 + 유틸 분리
- src/app/page.tsx (658줄) → 섹션별 서브 컴포넌트 분리
- src/app/apt/[region]/[slug]/page.tsx (551줄) → 서브 컴포넌트 분리

**Dependencies:** Phase 2 (CLN-01 formatPrice 정리 후)

**Success Criteria:**
- 분할 후 모든 파일 300줄 이하
- `pnpm build` 성공
- 기능 동작 변경 없음

---

### Phase 4: 에러 핸들링 / 로깅
**Goal:** 에러가 사용자에게 친절하게 표시되고, 서버에서 구조화 로깅으로 추적 가능하다

**Requirements:** ERR-01, ERR-02, ERR-03, ERR-04

**Scope:**
- src/app/error.tsx (브랜드 에러 페이지) 구현/개선
- src/app/global-error.tsx 구현
- API 라우트에서 e.message 직접 반환 제거 → 일반 에러 메시지로 교체
- 구조화 로깅 유틸 구현 (src/lib/logger.ts)
- 크론잡 에러 시 Slack 알림 일관성 확인

**Dependencies:** 없음

**Success Criteria:**
- error.tsx, global-error.tsx 파일 존재 및 브랜드 UI 적용
- grep으로 API 라우트에서 e.message 직접 반환 0건
- 로깅 유틸이 모든 API 라우트에서 사용됨

---

### Phase 5: 성능 최적화
**Goal:** 검색 응답 속도 개선, DB 안정성 확보, 크론잡 충돌 해소

**Requirements:** PERF-01, PERF-02, PERF-03, PERF-04

**Scope:**
- pg_trgm 확장 활성화 + GIN 인덱스 생성 (apt_name, region_name, dong_name)
- DB 커넥션 풀 max 조정 또는 Neon pooler 활용
- vercel.json 크론잡 스케줄 겹침 정리 (시간 간격 확보)
- rate limiter 개선 (서버리스 대응)

**Dependencies:** Phase 2 (패키지 정리 후 DB 설정 변경)

**Success Criteria:**
- EXPLAIN으로 검색 쿼리가 인덱스 사용 확인
- 크론잡 동시 실행 시 커넥션 에러 없음
- 크론잡 스케줄 간 최소 10분 간격

---

### Phase 6: TypeScript 타입 강화
**Goal:** 핵심 모듈의 타입 안전성이 확보되어 런타임 에러 가능성이 줄어든다

**Requirements:** TYPE-01, TYPE-02, TYPE-03

**Scope:**
- src/types/ 또는 src/lib/types.ts에 DB 모델 인터페이스 정의
- API 라우트 응답 타입 적용
- page.tsx, KakaoMap.tsx 등 주요 컴포넌트의 any → 구체 타입

**Dependencies:** Phase 3 (컴포넌트 분할 후)

**Success Criteria:**
- 핵심 3개 테이블(apt_transactions, apt_complexes, finance_rates)에 타입 존재
- grep 'any' 결과에서 핵심 파일 any 사용 50% 이상 감소

---

### Phase 7: 접근성 (a11y)
**Goal:** 보조 기술 사용자가 주요 기능을 이용할 수 있다

**Requirements:** A11Y-01, A11Y-02, A11Y-03, A11Y-04

**Scope:**
- 탭, 버튼, 링크에 role, aria-label, aria-selected 등 추가
- 키보드 내비게이션 (Tab, Enter, Escape) 동작 확인 및 수정
- 차트에 aria-label + 텍스트 요약, 지도에 대안 텍스트
- layout.tsx에 skip-to-content 링크 추가

**Dependencies:** Phase 3 (컴포넌트 분할 후)

**Success Criteria:**
- 주요 인터랙티브 요소에 ARIA 속성 존재
- Tab 키로 주요 페이지 내비게이션 가능
- skip navigation 동작 확인

---

### Phase 8: 보안 강화
**Goal:** 알려진 보안 취약점이 모두 해소된다

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06

**Scope:**
- NEXT_PUBLIC_ADMIN_EMAILS → ADMIN_EMAILS (서버 전용)
- DAM content API에 CRON_SECRET 또는 Firebase 인증 추가
- push subscribe에 인증 또는 강화된 rate limit 추가
- SSL rejectUnauthorized: true + CA 인증서 설정
- CSP 헤더 추가 (Kakao SDK, GA, AdSense, Firebase 도메인 허용)
- proxy.ts rate limiter 서버리스 대응 교체

**Dependencies:** Phase 1~7 완료 후 (다른 수정에서 발생한 보안 이슈까지 통합 처리)

**Success Criteria:**
- NEXT_PUBLIC_ADMIN_EMAILS 환경변수 0건
- DAM API 비인증 접근 시 401/403 반환
- curl 응답에 CSP 헤더 존재
- SSL 설정에 rejectUnauthorized: false 0건

---

## Dependency Graph

```
Phase 1 (SEO) ──────────────────────────────────────┐
Phase 2 (코드정리) ─── Phase 3 (컴포넌트분할) ──┐   │
Phase 4 (에러핸들링) ───────────────────────────┤   │
Phase 5 (성능) ─────────────────────────────────┤   │
                    Phase 6 (타입) ─────────────┤   │
                    Phase 7 (접근성) ────────────┤   │
                                                └───┴── Phase 8 (보안)
```

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| supabase → db 리네이밍 시 import 누락 | Build 실패 | 자동 검색+치환, 빌드 검증 |
| 컴포넌트 분할 시 상태/props 누락 | 기능 깨짐 | 분할 후 각 페이지 수동 확인 |
| CSP 헤더로 외부 스크립트 차단 | GA/AdSense/Kakao 동작 중단 | 도메인별 허용 규칙 사전 정의 |
| pg_trgm 인덱스 추가 시 Neon 제한 | 인덱스 생성 실패 | Neon free tier 제약 확인 |
| 크론잡 스케줄 변경 시 데이터 수집 누락 | 일일 데이터 빈틈 | 변경 전후 데이터 검증 |

---
*Roadmap created: 2026-03-26*
*Last updated: 2026-03-26 after initial creation*
