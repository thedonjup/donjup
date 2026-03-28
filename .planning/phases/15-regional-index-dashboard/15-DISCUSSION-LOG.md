# Phase 15: 지역 지수 대시보드 - Discussion Log

> **Audit trail only.**

**Date:** 2026-03-28
**Phase:** 15-regional-index-dashboard
**Areas discussed:** 군집 정의, 지수 산출, 대시보드 레이아웃, market 페이지 통합
**Mode:** --auto

---

## 군집 정의

| Option | Description | Selected |
|--------|-------------|----------|
| region-codes.ts 상수 | CLUSTER_DEFINITIONS 배열 | ✓ |
| DB 테이블 | clusters 테이블로 관리 | |
| config 파일 | JSON 설정 파일 | |

**User's choice:** [auto] region-codes.ts 상수 (recommended — 군집 변경 빈도 낮음, 코드 내 관리)

---

## 지수 산출 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 실시간 서버 계산 | revalidate + DB 직접 쿼리 | ✓ |
| 크론잡 사전 계산 | index_cache 테이블에 저장 | |
| 클라이언트 계산 | 거래 데이터 전달 후 계산 | |

**User's choice:** [auto] 실시간 서버 계산 (recommended — 데이터량 관리 가능, DB 스키마 변경 불필요)

---

## 대시보드 레이아웃

| Option | Description | Selected |
|--------|-------------|----------|
| 카드 그리드 + 상세 페이지 | 군집별 카드, 클릭 시 상세 이동 | ✓ |
| 단일 페이지 풀 차트 | 모든 군집 차트 한 페이지 | |
| 탭 전환 | 군집별 탭으로 전환 | |

**User's choice:** [auto] 카드 그리드 + 상세 (recommended — S&P500 스타일, 정보 계층화)

---

## market 페이지 통합

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 테이블 컬럼 추가 | 평균/중위가 컬럼 | ✓ |
| 별도 섹션 | 시세 요약 카드 섹션 | |

**User's choice:** [auto] 컬럼 추가 (recommended — 기존 UI 패턴 유지)

## Claude's Discretion

- 카드 디자인, 스파크라인 색상
- 군집 상세 페이지 레이아웃
- 지수 최소 거래 건수
- 라우트 결정 (/index vs /market/index)

## Deferred Ideas

None
