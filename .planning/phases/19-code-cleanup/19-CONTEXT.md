# Phase 19: 코드 정리 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

프로덕션 코드에서 타입 안전하지 않은 패턴과 미사용 코드를 제거하여 코드베이스를 깔끔하게 한다. `as any` 캐스트 최소화, 미사용 import/변수 0건, DB 연결 패턴 Drizzle 단일화 확인.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Key constraints from ROADMAP:
- `as any` 캐스트 5개 미만
- ESLint no-unused-vars/no-unused-imports 위반 0건
- createClient, createRentServiceClient, getPool 패턴 0건 (Phase 18에서 대부분 처리됨)

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
