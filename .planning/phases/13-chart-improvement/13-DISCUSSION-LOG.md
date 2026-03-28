# Phase 13: 차트 개선 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 13-chart-improvement
**Areas discussed:** 기간 필터 구현, 전세가 듀얼 라인, 전세가율 오버레이, JeonseRatioChart 처리
**Mode:** --auto (all areas auto-selected with recommended defaults)

---

## 기간 필터 구현

| Option | Description | Selected |
|--------|-------------|----------|
| AptDetailClient에서 날짜 필터 | 선택 기간에 따라 txns 필터 후 차트에 전달 | ✓ |
| 차트 내부 필터 | PriceHistoryChart가 전체 데이터 받아 자체 필터 | |
| 서버 쿼리 변경 | 기간별로 DB 재쿼리 | |

**User's choice:** [auto] AptDetailClient에서 날짜 필터 (recommended — 기존 패턴 유지, 추가 DB 호출 없음)

---

## 전세가 듀얼 라인

| Option | Description | Selected |
|--------|-------------|----------|
| 좌측 Y축 공유 추이선 | 매매/전세 같은 Y축, 색상으로 구분 | ✓ |
| 별도 차트 | 전세가 별도 차트로 표시 | |
| 전세 거래점 + 추이선 | 거래점까지 표시 | |

**User's choice:** [auto] 좌측 Y축 공유 추이선 (recommended — 가격 단위 동일, 비교 직관적)

---

## 전세가율 오버레이

| Option | Description | Selected |
|--------|-------------|----------|
| 우측 Y축 + 체크박스 토글 | PriceHistoryChart 내 오버레이, 기본 OFF | ✓ |
| 별도 차트 유지 | Phase 11 JeonseRatioChart 그대로 유지 | |
| 항상 표시 | 오버레이 항상 ON | |

**User's choice:** [auto] 우측 Y축 + 체크박스 토글 (recommended — CHART-03 요구사항 정확히 충족, 기본 OFF로 차트 간결 유지)

---

## JeonseRatioChart 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 제거 + 오버레이로 대체 | 별도 차트 삭제, PriceHistoryChart에 통합 | ✓ |
| 병행 유지 | 오버레이와 별도 차트 모두 유지 | |

**User's choice:** [auto] 제거 + 오버레이로 대체 (recommended — 중복 제거, 사용자 경험 통합)

---

## Claude's Discretion

- 기간 탭/면적 칩 배치 관계
- 듀얼 Y축 라벨 포맷
- 오버레이 활성 시 차트 높이
- 추이선 스타일 미세 조정

## Deferred Ideas

None
