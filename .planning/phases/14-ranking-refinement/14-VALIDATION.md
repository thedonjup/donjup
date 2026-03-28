---
phase: 14
slug: ranking-refinement
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 14 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 없음 — Out of Scope |
| **Quick run command** | `npx next build` |
| **Full suite command** | 수동 브라우저 확인 (홈 페이지 랭킹) |
| **Estimated runtime** | ~30s (build) |

## Sampling Rate

- **After every task commit:** `npx next build`
- **After every plan wave:** 브라우저에서 홈 랭킹 확인
- **Max feedback latency:** 30 seconds

## Manual-Only Verifications

| Behavior | Requirement | Why Manual |
|----------|-------------|------------|
| 저층 거래 변동률이 고층 환산값으로 표시 | RANK-01 | 실 데이터 확인 필요 |
| 이상거래 랭킹 제외 | RANK-02 | 직거래 데이터 유무 확인 |
| 저층 뱃지 표시 | RANK-03 | 시각 확인 |

## Validation Sign-Off

- [x] All tasks have build verify
- [x] `nyquist_compliant: true`

**Approval:** pending
