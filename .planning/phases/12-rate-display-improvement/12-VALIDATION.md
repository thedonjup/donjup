---
phase: 12
slug: rate-display-improvement
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 없음 — 테스트 인프라 Out of Scope (별도 마일스톤) |
| **Config file** | 없음 |
| **Quick run command** | `npx next build` (빌드 성공 확인) |
| **Full suite command** | 수동 브라우저 확인 (금리 페이지) |
| **Estimated runtime** | ~30 seconds (build), ~60 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Run `npx next build` — 빌드 에러 없음 확인
- **After every plan wave:** 브라우저에서 금리 페이지 로드, accordion/확장 인터랙션 확인
- **Before `/gsd:verify-work`:** 히어로 카드 + accordion + 은행별 확장 3가지 시각 확인
- **Max feedback latency:** 30 seconds (build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | RATE-01 | build + manual | `npx next build` | N/A | ⬜ pending |
| 12-01-02 | 01 | 1 | RATE-02 | build + manual | `npx next build` | N/A | ⬜ pending |
| 12-01-03 | 01 | 1 | RATE-03, RATE-02 | build + manual | `npx next build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. 테스트 인프라는 별도 마일스톤.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 히어로 카드에 평균금리 1개만 표시 | RATE-01 | DOM 렌더링 확인 필요 | /rate 페이지 → 최상단에 평균금리 카드만 보임 |
| 세부 지표 accordion 접기/펼치기 | RATE-02 | CSS transition + DOM 인터랙션 | /rate 페이지 → 주요 금리 지표 섹션 → 각 항목 클릭 → 펼쳐짐/접힘 |
| 은행별 금리 인라인 확장 | RATE-03 | 클릭 인터랙션 | /rate 페이지 → 은행별 주담대 → 행 클릭 → 상세 확장 |
| 모바일 레이아웃 | RATE-01~03 | 반응형 확인 | 모바일 뷰포트에서 히어로+accordion+은행확장 동작 확인 |

---

## Validation Sign-Off

- [x] All tasks have manual verify (테스트 인프라 Out of Scope)
- [x] Sampling continuity: build 검증 + 수동 확인으로 커버
- [x] Wave 0 covers all MISSING references — 해당 없음
- [x] No watch-mode flags
- [x] Feedback latency < 30s (build)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
