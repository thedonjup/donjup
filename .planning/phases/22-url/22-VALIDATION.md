---
phase: 22
slug: url
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / Next.js build check |
| **Config file** | vitest.config.ts or "none — Wave 0 installs" |
| **Quick run command** | `npx next build 2>&1 | tail -20` |
| **Full suite command** | `npx next build && npx vitest run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx next build 2>&1 | tail -20`
- **After every plan wave:** Run `npx next build && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | URL-01 | build+route | `npx next build` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | URL-02 | proxy redirect | `curl -sI /apt/region/slug` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | URL-03 | grep | `grep -r "toSlug\|makeSlug" src/` | ✅ | ⬜ pending |
| 22-02-02 | 02 | 2 | URL-04 | sitemap check | `curl -s /sitemap.xml \| grep govtComplexId` | ❌ W0 | ⬜ pending |
| 22-02-03 | 02 | 2 | URL-05 | build+navigate | `npx next build` | ✅ | ⬜ pending |
| 22-02-04 | 02 | 2 | URL-06 | build | `npx next build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify govtComplexId null count in DB before execution
- [ ] Existing test infrastructure (Next.js build) covers route validation

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 308 redirect in browser | URL-02 | Browser address bar change needs visual check | Navigate to old URL, verify address bar shows new URL |
| Kakao share link | URL-06 | External service integration | Click share button, verify shared URL format |
| Profile favorites navigation | URL-05 | E2E user flow | Click favorite apt on profile page, verify no 404 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
