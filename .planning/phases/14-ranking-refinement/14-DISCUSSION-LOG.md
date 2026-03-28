# Phase 14: 랭킹 정교화 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-28
**Phase:** 14-ranking-refinement
**Areas discussed:** 변동률 재계산, 이상거래 필터링, 저층 라벨
**Mode:** --auto

---

## 변동률 재계산 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 서버 컴포넌트에서 보정 | DB 변경 없이 조회 시 adjustFloorPrice 적용 | ✓ |
| DB 크론잡에서 재계산 | change_rate 컬럼 자체를 보정값으로 업데이트 | |
| 클라이언트에서 계산 | RankingTabs에서 실시간 보정 | |

**User's choice:** [auto] 서버 컴포넌트에서 보정 (recommended — DB 스키마 무변경, 기존 데이터 보존)

---

## 이상거래 필터링 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 조회 시 필터 | Phase 10 함수 재사용, 서버에서 필터 | ✓ |
| DB 수집 시 마킹 | is_suspicious 컬럼 추가 | |
| SQL WHERE 절 | DB 쿼리에서 직접 필터 | |

**User's choice:** [auto] 조회 시 필터 (recommended — Phase 10 로직 재사용, DB 변경 불필요)

---

## 저층 라벨 표시

| Option | Description | Selected |
|--------|-------------|----------|
| floor <= 3 뱃지 | 회색 소형 뱃지 "저층" | ✓ |
| 별도 컬럼 | 테이블에 층수 컬럼 추가 | |
| 툴팁 표시 | 호버/터치 시 층수 표시 | |

**User's choice:** [auto] 뱃지 (recommended — 기존 drop_level 뱃지 패턴 일관)

## Claude's Discretion

- 저층 뱃지 색상/크기
- 신고가 랭킹 보정 적용 여부
- 빈 랭킹 fallback

## Deferred Ideas

None
