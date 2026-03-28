---
phase: 11
slug: jeonse-gap-analysis
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 없음 — 테스트 인프라 Out of Scope (별도 마일스톤) |
| **Config file** | 없음 |
| **Quick run command** | `npx next build` (빌드 성공 확인) |
| **Full suite command** | 수동 브라우저 확인 (실 데이터 단지) |
| **Estimated runtime** | ~30 seconds (build), ~60 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Run `npx next build` — 빌드 에러 없음 확인
- **After every plan wave:** 브라우저에서 아파트 상세 페이지 로드, 면적 전환 시 갱신 확인
- **Before `/gsd:verify-work`:** 실제 전세 데이터 있는 단지에서 전세가율·갭·차트 3가지 확인
- **Max feedback latency:** 30 seconds (build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | GAP-01, GAP-02 | build + manual | `npx next build` | N/A | ⬜ pending |
| 11-01-02 | 01 | 1 | GAP-01, GAP-02 | manual | 면적 선택 시 전세가율/갭 갱신 | N/A | ⬜ pending |
| 11-02-01 | 02 | 1 | GAP-03 | build + manual | `npx next build` | N/A | ⬜ pending |
| 11-02-02 | 02 | 1 | GAP-03 | manual | 추이 차트 렌더링 확인 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. 테스트 인프라는 별도 마일스톤.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 면적 선택 시 전세가율(%) 표시 | GAP-01 | DOM 상호작용 필요 | 상세 페이지 → 면적 칩 클릭 → 전세가율 수치 변경 확인 |
| 면적 선택 시 갭 금액 표시 | GAP-02 | DOM 상호작용 필요 | 상세 페이지 → 면적 칩 클릭 → 갭 금액 수치 변경 확인 |
| 전세가율 추이 차트 렌더링 | GAP-03 | Recharts SVG 렌더링 | 상세 페이지 → 전세가율 차트 표시 여부 + 면적 전환 시 갱신 확인 |
| 전세가율 위험도 색상 | GAP-01 | 시각적 확인 | 70%↑ 빨강, 60-70% 노랑, 60%↓ 초록 확인 |
| 데이터 없는 면적 | GAP-01, GAP-02 | 엣지 케이스 | 전세 데이터 없는 면적 선택 시 "-" 표시 확인 |

---

## Validation Sign-Off

- [x] All tasks have manual verify (테스트 인프라 Out of Scope)
- [x] Sampling continuity: build 검증 + 수동 확인으로 커버
- [x] Wave 0 covers all MISSING references — 해당 없음
- [x] No watch-mode flags
- [x] Feedback latency < 30s (build)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
