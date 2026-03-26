---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 09
status: executing
last_updated: "2026-03-26T19:11:07.472Z"
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 17
  completed_plans: 18
---

# Project State: 돈줍 사이트 안정화

**Current Phase:** 09
**Milestone:** v1.0 — 사이트 안정화
**Status:** Executing Phase 09

## Active Phase

Phase 06 — 타입 (Plan 06-01, 06-02 complete)

## Completed Phases

(none)

## Key Context

- 8 phases total: SEO → 코드정리 → 컴포넌트분할 → 에러핸들링 → 성능 → 타입 → 접근성 → 보안
- 보안은 반드시 마지막 (다른 수정 후 발생할 보안 이슈 통합 처리)
- 31 requirements across 7 categories
- 모델 프로필: balanced (Sonnet 기본, 고급 사고 시 Opus, 단순 작업 시 Gemini)
- YOLO 모드 + Fine 단위 + 병렬 실행

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | 보안 마지막 배치 | 수정 과정에서 보안 이슈 추가 발생 가능 |
| 2026-03-26 | 새 기능 없이 안정화만 | 현재 품질 문제 우선 해결 |
| 2026-03-26 | ORM 교체 없이 기존 개선만 | 전면 교체 리스크 큼 |
| 2026-03-26 | Fine 단위 (8 phases) | 사용자 선택 |
| 2026-03-26 | formatPrice single-source via @/lib/format | 중복 정의 제거, 유지보수성 향상 |
| 2026-03-26 | postgres + @neondatabase/serverless 제거 | 미사용 패키지, pg만 유지 |
| 2026-03-26 | buildInfoWindowContent 추출 | 중복 info window HTML 단일 함수로 통합 |
| 2026-03-26 | MapTransaction KakaoMap.tsx에서 re-export | map/page.tsx 변경 없이 하위 호환성 유지 |
| 2026-03-26 | 외부 로깅 라이브러리 미사용 | 서버리스 환경 오버헤드 최소화 |
| 2026-03-26 | global-error.tsx 인라인 스타일 | globals.css가 layout.tsx 밖에서 로드 불가 |
| 2026-03-26 | 크론잡 응답에는 e.message 허용 | CRON_SECRET 보호 내부 엔드포인트이므로 운영 디버깅 우선 |
| 2026-03-26 | generic 에러 메시지 한국어 통일 | "서버 오류가 발생했습니다" — 사용자 대면 일관성 |
| 2026-03-26 | Pool max 5→10 | 22 cron jobs가 동시 실행될 수 있어 Neon free tier 범위 내에서 보수적 증가 |
| 2026-03-26 | pg_trgm GIN index CONCURRENTLY | 라이브 프로덕션 테이블 잠금 방지 |
| 2026-03-26 | Migration script as standalone SQL | 운영자가 프로덕션 적용 시점을 직접 제어 |
| 2026-03-26 | fetch-bank-rates moved to 10:30 Mon | fetch-reb-index와 동일 분 충돌 방지 |
| 2026-03-26 | fetch-rents 21:xx 블록으로 이동 | transactions 20:xx 완료 후 rents 시작 — DB 풀 고갈 방지 |
| 2026-03-26 | In-memory rate limiter 제거 | 서버리스 cold start마다 초기화되어 무효 — Vercel WAF 권고 |
| 2026-03-26 | JSONB 컬럼은 unknown 타입 사용 | any 대신 타입 안전성 확보 |
| 2026-03-26 | extremes route Partial<AptTransaction> | partial select이므로 전체 타입 강제 불가 |
| 2026-03-26 | Kakao SDK → kakao.d.ts 미니멀 namespace | 공식 TS 타입 없음, 필요 클래스만 선언 |
| 2026-03-26 | client.ts then() any 유지 | unknown으로 변경 시 전체 codebase 연쇄 오류 |
| 2026-03-26 | role=figure on PriceHistoryChart | Recharts SVG 컨테이너 레벨 처리 |
| 2026-03-26 | role=application on KakaoMap | 인터랙티브 지도 위젯 적합 role |
| 2026-03-26 | Roving tabindex로 탭 키보드 내비게이션 구현 | WAI-ARIA authoring practices 권장 방식 |
| 2026-03-26 | TransactionTabs tabpanel hidden 속성 토글 | conditional render 대신 DOM 유지로 스크린 리더 접근성 개선 |
| 2026-03-26 | MobileNav Escape 핸들러 별도 useEffect | open 상태 의존성 분리로 리스너 정확한 attach/detach 보장 |
| 2026-03-26 | CSP unsafe-inline + unsafe-eval 유지 | layout.tsx 인라인 스크립트(theme init, GA, JSON-LD) + Kakao Maps SDK eval 사용 — nonce 리팩터 다음 마일스톤으로 |
| 2026-03-26 | ADMIN_EMAILS 서버 전용 | NEXT_PUBLIC_ prefix 제거로 클라이언트 번들 노출 차단 |
| 2026-03-26 | ssl: true (Neon 표준 CA 신뢰) | rejectUnauthorized: false 제거 — Neon은 공인 CA 사용 |

| 2026-03-26 | DAM content API Firebase ID token 인증 | 클라이언트가 Firebase Auth 사용하므로 CRON_SECRET보다 ID token이 적합 |
| 2026-03-26 | push subscribe origin 허용 목록 제한 | donjup.com + www.donjup.com만 허용, 개발환경 제외 |

---
*Last updated: 2026-03-26 after 08-02 completion*
