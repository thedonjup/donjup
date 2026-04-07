# Milestones

## v1.4 전환 최적화 + 리텐션 기초 (Planning / Started)

**Phases:** 5 phases (25-29), 0/5 complete

**Planned:**

- Phase 25 (광고/추적 기반 구축): 광고 슬롯/전역 스크립트/측정 기반 정리
- Phase 26 (계산기/제휴 전환 강화): 계산기 결과 후 CPA CTA 및 상세→계산기 전환 강화
- Phase 27 (탐색 퍼널 최적화): 메인/리포트/상세 간 내부 순환 강화
- Phase 28 (리텐션 MVP): 관심단지 저장 + 최근본단지/재진입 포인트
- Phase 29 (알림/실험/분석 고도화): 기본 알림 조건 + 핵심 이벤트 분석 + CTA 실험

**Notes:**

- 일부 Phase 25/26 관련 구현 조각(AdSlot, GA event helper, CPA 배너)은 이미 코드베이스에 존재함
- 따라서 v1.4는 신규 구축보다 ‘기존 구현 정리 + 실제 운영 경로 연결’ 비중이 큼

---

---

## v1.3 서비스 품질 개선 (Shipped: 2026-04-05)

**Phases completed:** 6 phases, 6/6 complete

**Key accomplishments:**

- 포맷 유틸 중앙화 + 데이터 표현 정규화
- 디자인 시스템 통합 + 다크모드 정상화
- govtComplexId 백필
- URL 구조 개편 + Sitemap 완성
- Vercel Blob + Instagram 포스팅 파이프라인 복구
- 검색 결과 보강 + 차트 범례 개선

---

## v1.2 코드 품질 강화 (Shipped: 2026-03-28)

**Phases completed:** 4 phases, 9 plans

**Key accomplishments:**

- Vitest 54 유닛 + 12 통합 + Playwright 4 E2E = 70 tests 구축
- drizzle-orm@0.45.2 + 13 pgTable 스키마, singleton db 진입점 (ssl:{rejectUnauthorized:false})
- 27개 API 라우트/크론잡 Supabase → Drizzle ORM 마이그레이션 완료
- 8개 getPool() call site Drizzle 전환, 레거시 DB 파일 삭제 (client.ts/server.ts/rent-client.ts)
- `as any` 0건, 미사용 import 0건, 레거시 DB 패턴 0건

---

## v1.1 데이터 분석 고도화 (Shipped: 2026-03-28)

**Phases completed:** 6 phases, 12 plans

**Key accomplishments:**

- 가격 정규화 유틸 모듈(adjustFloorPrice, filterOutliers, movingMedian) + 전체 면적 탭 제거
- 차트 재구성: 거래 산점도 + 3개월 이동중위가 추이선 + 직거래 표시 + 저층 토글
- 저층 거래 고층 환산가 보정 (1층 +14.9%, 2층 +11.1%, 3층 +4.2%)
- 면적별 전세가율(%) + 갭 금액 카드, 전세가율 추이 월별 LineChart
- 금리 히어로 카드 + accordion + 은행별 확장 행 (BANK_UNKNOWN 평균 제외)
- 기간 탭(1개월~전체) + 매매/전세 듀얼 라인 차트 + 듀얼 Y축 + 전세가율 오버레이
- 랭킹 정규화: 고층 환산 변동률 + IQR 이상거래 필터 + 저층 뱃지
- 군집 지수 엔진(computeClusterIndex) + S&P500 스타일 대시보드(/index) 배포

---

## v1.0 사이트 안정화 (Shipped: 2026-03-28)

**Phases completed:** 9 phases, 21 plans

**Key accomplishments:**

- SEO: Canonical URL + 고유 title + OG Image 정상화
- 코드 정리: formatPrice 중복 제거, supabase→db 리네이밍, 미사용 패키지 제거
- 컴포넌트 분할: 대형 단일 파일 → 관리 가능한 크기
- 에러 핸들링: 구조화 로깅 유틸 + 브랜드 에러 페이지 + 크론잡 Slack 알림
- 성능: pg_trgm GIN 인덱스 + DB 커넥션 풀 조정 + 크론잡 스케줄 정리
- TypeScript: DB 모델 인터페이스 + API 응답 타입 + any 제거
- 접근성: ARIA + 키보드 내비게이션 + skip-to-content + 차트/지도 텍스트 대안
- 보안: ADMIN_EMAILS 서버 전용 + SSL 수정 + DAM 인증 + CSP
- 모바일 UI: 전체 페이지 모바일 최적화 (카드, 칩, 차트, 테이블, 지도)
