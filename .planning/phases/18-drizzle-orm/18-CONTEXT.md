# Phase 18: Drizzle ORM 교체 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

모든 DB 접근이 타입 안전한 Drizzle 쿼리로 통일되어 raw SQL과 복수 클라이언트 패턴이 제거된다. Drizzle 설치 + 스키마 정의 + 기존 쿼리 마이그레이션.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Key constraints from ROADMAP:
- `import { db } from '@/lib/db'` 단일 진입점
- apt_transactions, apt_rent_transactions, finance_rates, apt_complexes 스키마 정의
- getPool().query(), createClient(), createRentServiceClient() 호출 0건
- 기존과 동일한 데이터 반환, 회귀 없음
- DB 스키마 변경 없음 (기존 테이블에 매핑만)
- CockroachDB ssl: { rejectUnauthorized: false } 필수 (CLAUDE.md)

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
