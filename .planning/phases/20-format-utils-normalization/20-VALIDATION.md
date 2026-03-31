---
phase: 20
slug: format-utils-normalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (verified in vitest.config.ts) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 0 | DATA-01, DATA-02, DATA-03 | unit | `npm test -- tests/unit/format.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | DATA-01 | unit | `npm test -- tests/unit/format.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 1 | DATA-02 | unit | `npm test -- tests/unit/format.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-03 | 02 | 1 | DATA-03 | unit | `npm test -- tests/unit/format.test.ts` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 2 | DATA-04 | grep | `grep -r "function formatPrice" src/ --include="*.ts" --include="*.tsx"` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/format.test.ts` — stubs for DATA-01, DATA-02, DATA-03 (new format function unit tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No local format duplicates outside `src/lib/format.ts` | DATA-04 | Requires grep across entire `src/` | `grep -r "function formatPrice\|function sqmToPyeong\|function formatArea" src/ --include="*.ts" --include="*.tsx"` must return only `src/lib/format.ts` lines |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
