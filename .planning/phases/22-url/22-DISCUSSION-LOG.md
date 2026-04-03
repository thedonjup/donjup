# Phase 22: URL 구조 개편 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 22-url
**Areas discussed:** 새 URL 형식, 리다이렉트 전략, null govtComplexId 처리, 내부 링크 마이그레이션

---

## 새 URL 형식

| Option | Description | Selected |
|--------|-------------|----------|
| /apt/[govtComplexId] | region 제거, govtComplexId만으로 단순화. 가장 짧고 canonical | ✓ |
| /apt/[region]/[govtComplexId] | 현재 구조 유지하면서 slug만 govtComplexId로 교체 | |
| /apt/[region]/[name-slug] | 사람이 읽을 수 있는 slug 유지 | |

**User's choice:** /apt/[govtComplexId]
**Notes:** 페이지에서 region 정보는 DB에서 조회

---

## 리다이렉트 전략

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js middleware | 요청 시점에서 가로채고 308 리다이렉트. Edge에서 동작 | ✓ |
| 기존 page에서 redirect() | 현재 page.tsx에서 DB 조회 후 redirect() 호출 | |
| next.config redirects | 정적 redirect 규칙 정의 | |

**User's choice:** Next.js middleware
**Notes:** None

### HTTP 상태 코드

| Option | Description | Selected |
|--------|-------------|----------|
| 308 Permanent | HTTP 메서드 보존 + 영구 리다이렉트. Success Criteria에 308로 명시됨 | ✓ |
| 301 Permanent | 전통적 영구 리다이렉트. GET에서는 308과 동일 | |
| 302 Temporary | 임시 리다이렉트 | |

**User's choice:** 308 Permanent
**Notes:** None

---

## null govtComplexId 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 백필 후 통일 | MOLIT API로 govtComplexId 백필 → null 0건으로 만든 후 통일된 URL 체계 | ✓ |
| 한글 slug fallback 유지 | govtComplexId 없는 단지는 한글 slug URL 유지 | |
| 백필 + fallback 병행 | 백필 시도 + 매칭 실패 시 한글 slug fallback | |

**User's choice:** 백필 후 통일
**Notes:** None

---

## 내부 링크 마이그레이션

| Option | Description | Selected |
|--------|-------------|----------|
| 일괄 전환 | 모든 내부 링크를 한 번에 /apt/[govtComplexId]로 전환 | ✓ |
| 점진적 전환 | 페이지별로 나눠서 전환 | |

**User's choice:** 일괄 전환
**Notes:** None

### 데이터 접근 방식

**User's question:** "1번 2번중 속도 빠르고 나중을 위해 뭐가 더 좋은거야?"
**Claude's answer:** 둘 다 하는 게 맞음 — DB 쿼리에 govtComplexId 추가 + aptUrl() 중앙 유틸 함수. 2번이 1번을 포함하는 구조.
**User's choice:** 동의 (두 방식 모두 적용)

---

## Claude's Discretion

- middleware에서 slug→govtComplexId 매핑 방식
- aptUrl() 함수의 인터페이스 설계
- 백필 스크립트의 구체적 구현 방식

## Deferred Ideas

None
