---
phase: 07-accessibility
plan: 02
subsystem: accessibility
tags: [a11y, aria, sr-only, charts, map, recharts, kakaomap]
dependency_graph:
  requires: []
  provides: [A11Y-03]
  affects: [PriceHistoryChart, MiniAreaChart, KakaoMap, MapSidePanel]
tech_stack:
  added: []
  patterns: [role=figure, role=img, role=application, sr-only, aria-live, aria-roledescription]
key_files:
  created: []
  modified:
    - src/components/charts/PriceHistoryChart.tsx
    - src/components/charts/MiniAreaChart.tsx
    - src/components/charts/MiniAreaChartWrapper.tsx
    - src/components/map/KakaoMap.tsx
    - src/components/map/MapSidePanel.tsx
decisions:
  - "role=figure on PriceHistoryChart wrapper div — Recharts SVG 직접 접근 불가, 컨테이너 레벨에서 처리"
  - "role=application on KakaoMap div — 자체 키보드/마우스 핸들러 보유한 인터랙티브 위젯에 적합"
  - "sr-only 텍스트에 filteredTransactions.length 포함 — 현재 필터 상태 반영"
metrics:
  duration: "54s"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_modified: 5
---

# Phase 07 Plan 02: 차트/지도 텍스트 대안 Summary

**One-liner:** Recharts 차트에 role=figure + sr-only 가격 요약, KakaoMap에 role=application + aria-label + sr-only 거래 건수 설명 추가

## What Was Built

차트와 지도 컴포넌트에 스크린 리더 접근성을 위한 ARIA 속성과 텍스트 대안을 추가했다.

### Task 1: 차트 컴포넌트 aria-label + 텍스트 요약

**PriceHistoryChart.tsx:**
- 최상위 div에 `role="figure"`, `aria-label="가격 추이 차트"` 추가
- `<p className="sr-only">` 로 기간/최저가/최고가/거래 건수 텍스트 요약 추가
- 크기 필터 탭 그룹에 `role="tablist"`, `aria-label="면적 필터"` (linter 자동 추가)
- SizeTab 버튼에 `role="tab"`, `aria-selected` (linter 자동 추가)

**MiniAreaChart.tsx:**
- `label?: string` prop 추가 (기본값: "가격 추이 미니 차트")
- 감싸는 `<div role="img" aria-label={label}>` 추가

**MiniAreaChartWrapper.tsx:**
- `label?: string` prop 전파

### Task 2: 지도 컴포넌트 대안 텍스트

**KakaoMap.tsx:**
- `mapRef` div에 `role="application"`, `aria-label="전국 아파트 실거래가 지도"`, `aria-roledescription="인터랙티브 지도"` 추가
- 지도 앞에 `<p className="sr-only">` 설명 추가 (거래 건수 동적 포함)
- 로딩 상태 div에 `aria-live="polite"` 추가

**MapSidePanel.tsx:**
- 필터 칩 그룹 div에 `role="group"`, `aria-label="지도 필터"` 추가

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 88a2855 | Task 1 | feat(07-02): 차트 컴포넌트 aria-label + sr-only 텍스트 요약 |
| b928a19 | Task 2 | feat(07-02): 지도 컴포넌트 대안 텍스트 + ARIA 추가 |

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written. A linter additionally enhanced SizeTab with `role="tab"` and `aria-selected` — retained as beneficial improvements.

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c 'aria-label' PriceHistoryChart.tsx` | 2 matches |
| `grep -c 'sr-only' PriceHistoryChart.tsx` | 1 match |
| `grep -c 'role="figure"' PriceHistoryChart.tsx` | 1 match |
| `grep -c 'aria-label' MiniAreaChart.tsx` | 1 match |
| `grep 'aria-label.*지도' KakaoMap.tsx` | match |
| `grep -c 'sr-only' KakaoMap.tsx` | 1 match |
| `grep -c 'role="application"' KakaoMap.tsx` | 1 match |
| `grep -c 'aria-live' KakaoMap.tsx` | 1 match |
| `pnpm build` | success |

## Known Stubs

None.

## Self-Check: PASSED
