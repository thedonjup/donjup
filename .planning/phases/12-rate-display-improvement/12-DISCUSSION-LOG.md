# Phase 12: 금리 표현 개선 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 12-rate-display-improvement
**Areas discussed:** 대표 금리 산출, 정보 계층 구조, 은행별 확장 UI, 기존 차트 유지
**Mode:** --auto (all areas auto-selected with recommended defaults)

---

## 대표 금리 산출

| Option | Description | Selected |
|--------|-------------|----------|
| 은행별 주담대 최저금리 산술평균 | BANK_* 데이터의 rate_value 평균 | ✓ |
| 기준금리 단독 표시 | BASE_RATE만 대표로 | |
| COFIX 신규 기준 | 주담대 변동금리 기준 | |

**User's choice:** [auto] 은행별 주담대 최저금리 산술평균 (recommended — 사용자에게 가장 실용적)

---

## 정보 계층 구조

| Option | Description | Selected |
|--------|-------------|----------|
| 히어로 카드 + accordion | 대표금리 카드 1개, 나머지 접기 | ✓ |
| 탭 분리 | 대표금리 탭 + 세부 탭 | |
| 스크롤 기반 | 대표금리 고정 + 나머지 스크롤 | |

**User's choice:** [auto] 히어로 카드 + accordion (recommended — 정보 계층 명확, 구현 간단)

---

## 은행별 확장 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 인라인 확장 (details/summary) | 행 클릭 시 아래로 확장 | ✓ |
| 모달/시트 | 클릭 시 팝업 | |
| 별도 페이지 | 은행 클릭 시 상세 페이지 이동 | |

**User's choice:** [auto] 인라인 확장 (recommended — 컨텍스트 유지, UX 자연스러움)

---

## 기존 차트 유지

| Option | Description | Selected |
|--------|-------------|----------|
| accordion 내부 유지 | MiniAreaChart를 접힌 세부 영역에 유지 | ✓ |
| 제거 | 차트 완전 제거 | |
| 히어로에 통합 | 대표금리 차트를 히어로에 | |

**User's choice:** [auto] accordion 내부 유지 (recommended — 기존 데이터 활용, 사용자 요청 시 확인)

---

## Claude's Discretion

- accordion 애니메이션 방식
- 히어로 카드 스타일/크기
- 은행별 확장 레이아웃
- 변동 이력 테이블 처리

## Deferred Ideas

None
