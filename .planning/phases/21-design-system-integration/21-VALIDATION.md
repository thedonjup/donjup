---
phase: 21
slug: design-system-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~3 seconds |

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
| 21-01-01 | 01 | 1 | DESIGN-02 | unit | `grep '@custom-variant dark' src/app/globals.css` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | DESIGN-01 | unit | `grep 'var(--' src/lib/constants/drop-level.ts` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | DESIGN-01,03 | grep | `grep -c "style={{" src/components/charts/PriceHistoryChart.tsx` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | DESIGN-01,03 | grep | `grep -c "#[0-9a-fA-F]" src/components/apt/TransactionTabs.tsx` | ✅ | ⬜ pending |
| 21-03-01 | 03 | 2 | DESIGN-04 | visual | Dark mode toggle check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/constants/drop-level.ts` — centralize DROP_LEVEL_CONFIG with CSS variable support
- [ ] `@custom-variant dark` declaration in globals.css

*Existing test infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark mode visual consistency | DESIGN-01 | Visual rendering check | Toggle dark mode, verify all pages render correctly |
| Recharts CSS var rendering | DESIGN-03 | Browser-dependent rendering | Check chart colors update on theme toggle |
| Drop level colors in dark mode | DESIGN-04 | Dynamic color calculation | Verify drop level badges show correct contrast in dark mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
