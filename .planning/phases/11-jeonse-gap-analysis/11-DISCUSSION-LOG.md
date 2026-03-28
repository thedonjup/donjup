# Phase 11: 전세가율·갭 분석 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 11-jeonse-gap-analysis
**Areas discussed:** 전세가율 산출 기준, 갭 분석 표시 위치, 전세가율 추이 차트, 데이터 부족 처리
**Mode:** --auto (all areas auto-selected with recommended defaults)

---

## 전세가율 산출 기준

| Option | Description | Selected |
|--------|-------------|----------|
| 최근 1건 기준 | 면적별 가장 최근 순수전세 보증금 / 최근 매매가 | ✓ |
| 최근 3개월 중위가 기준 | 3개월간 전세/매매 중위가 비율 | |
| 가중평균 기준 | 최근 N건 가중평균 | |

**User's choice:** [auto] 최근 1건 기준 (recommended — 간단하고 직관적, 사용자가 "현재" 전세가율을 원함)
**Notes:** Phase 10의 중위가 패턴과 달리, 전세가율은 최신 시점 기준이 투자 판단에 더 유용

---

## 갭 분석 표시 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 StatCard 면적 연동 | page.tsx의 StatCard를 AptDetailClient 내부로 이동, selectedSize 연동 | ✓ |
| 별도 갭 분석 섹션 | 차트 아래 독립 섹션 | |
| 테이블 내 인라인 | TransactionTabs에 전세가율 컬럼 추가 | |

**User's choice:** [auto] 기존 StatCard 면적 연동 (recommended — 기존 UI 패턴 유지, 코드 변경 최소)
**Notes:** 현재 page.tsx에 이미 전세가/전세가율 StatCard 존재 — 면적별로 동적 변경되도록 개선

---

## 전세가율 추이 차트

| Option | Description | Selected |
|--------|-------------|----------|
| 별도 소형 LineChart | PriceHistoryChart 아래 160px 높이 전세가율(%) 차트 | ✓ |
| PriceHistoryChart 오버레이 | 기존 차트에 우측 Y축으로 전세가율 추가 | |
| 테이블만 | 차트 없이 월별 전세가율 테이블 | |

**User's choice:** [auto] 별도 소형 LineChart (recommended — 기존 차트 복잡도 유지, Phase 13 CHART-03 오버레이와 충돌 방지)
**Notes:** Phase 13에서 CHART-03 (전세가율 오버레이)가 예정되어 있으므로, Phase 11은 독립 차트로 구현

---

## 데이터 부족 처리

| Option | Description | Selected |
|--------|-------------|----------|
| "-" 표시 + 차트 미표시 | 전세 데이터 없으면 대시 표시, 추이 차트 숨김 | ✓ |
| 추정치 표시 | 인근 단지 전세가 참고하여 추정 | |
| 안내 메시지 | "전세 거래 데이터가 없습니다" 메시지 | |

**User's choice:** [auto] "-" 표시 + 차트 미표시 (recommended — 데이터 없으면 없는 것, 추정치는 오해 유발)

---

## Claude's Discretion

- 전세가율 추이 차트 색상/스타일
- 월별 중위가 최소 거래 건수 threshold
- StatCard 레이아웃 미세 조정
- 전세가율 위험도 색상 기준값 (70%/60%)

## Deferred Ideas

None
