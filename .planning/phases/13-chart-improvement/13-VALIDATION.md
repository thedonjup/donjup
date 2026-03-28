---
phase: 13
slug: chart-improvement
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 없음 — 테스트 인프라 Out of Scope (별도 마일스톤) |
| **Config file** | 없음 |
| **Quick run command** | `npx next build` (빌드 성공 확인) |
| **Full suite command** | 수동 브라우저 확인 (아파트 상세 페이지 차트) |
| **Estimated runtime** | ~30 seconds (build), ~120 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Run `npx next build` — 빌드 에러 없음 확인
- **After every plan wave:** 브라우저에서 아파트 상세 페이지 차트 확인
- **Before `/gsd:verify-work`:** 기간 탭 + 듀얼 라인 + 전세가율 오버레이 3가지 시각 확인
- **Max feedback latency:** 30 seconds (build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 13-01-01 | 01 | 1 | CHART-01 | build + manual | `npx next build` | ⬜ pending |
| 13-01-02 | 01 | 1 | CHART-02 | build + manual | `npx next build` | ⬜ pending |
| 13-02-01 | 02 | 2 | CHART-03 | build + manual | `npx next build` | ⬜ pending |
| 13-02-02 | 02 | 2 | CHART-03 | build + manual | `npx next build` | ⬜ pending |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 기간 탭 전환 시 차트 업데이트 | CHART-01 | DOM 인터랙션 | 상세 페이지 → 기간 탭 클릭 → 차트 점/추이선 변경 확인 |
| 매매가 + 전세가 듀얼 라인 표시 | CHART-02 | SVG 렌더링 확인 | 상세 페이지 → 두 색상 추이선 동시 표시 확인 |
| 전세가율 오버레이 토글 | CHART-03 | 체크박스 인터랙션 | 전세가율 표시 체크 → 우측 Y축 + 주황 점선 나타남 확인 |
| JeonseRatioChart 제거 확인 | D-16~18 | 시각 확인 | 상세 페이지에서 별도 전세가율 차트 없음 확인 |

---

## Validation Sign-Off

- [x] All tasks have manual verify
- [x] Sampling continuity: build 검증 + 수동 확인
- [x] Wave 0 — 해당 없음
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true`

**Approval:** pending
