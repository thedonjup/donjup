# Phase 9: 모바일 UI 전면 개편 - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Source:** 모바일 스크린샷 12장 분석

<domain>
## Phase Boundary

모바일(width < 768px) 화면의 UX/UI를 전면 개선한다. 데스크탑은 변경하지 않는다.
기존 기능은 유지하되, 모바일에서 읽기/터치/탐색이 자연스럽게 되도록 한다.

</domain>

<decisions>
## Implementation Decisions

### 1. 테이블 지역 컬럼 세로 줄바꿈 수정 (Critical)
- 신고가(/new-highs), 오늘의거래(/today) 테이블에서 "대전중구중촌동"이 한 글자씩 세로로 쪼개짐
- 원인: 테이블 컬럼 width가 고정이고 긴 지역명이 word-break됨
- 해결: 모바일에서 지역 컬럼을 시도+구까지만 표시하거나, 카드 레이아웃으로 전환

### 2. 사이드 메뉴 겹침 수정 (Critical)
- 햄버거 메뉴 열면 뒤 컨텐츠가 보이고 상호작용 가능
- backdrop이 있지만 z-index/투명도 문제
- 메뉴 열었을 때 뒤 컨텐츠 터치 완전 차단 필요

### 3. 아파트 상세 면적 선택 UI 개선 (Critical)
- 용산더프라임처럼 면적이 15종류 이상인 경우 화면 절반 차지
- 해결: 수평 스크롤 칩(chip) 형태로 변경, 최대 1줄

### 4. 차트 모바일 최적화 (High)
- 가격 추이 그래프가 너무 작고 레이블이 겹침
- 모바일에서 높이를 280px로 늘리고, Y축 레이블 간소화

### 5. 거래 테이블 모바일 카드 전환 (High)
- 6컬럼 테이블이 모바일에서 가로 스크롤 또는 잘림
- 모바일에서 카드 형태로 전환 (거래일, 면적/층, 가격을 세로 배치)

### 6. 홈 히어로 모바일 타이포그래피 (Medium)
- "경산1차운성 최고가 대비 -70.25% 하락" 텍스트가 줄바꿈 어색
- 모바일 전용 폰트 크기 + 줄바꿈 제어

### 7. 금리 은행명 코드 → 한국어 (Medium)
- BANK_UNKNOWN, BANK_KAKAO 등 코드명이 그대로 노출
- 한국어 은행명으로 매핑 (국민, 신한, 하나 등)

### 8. 지도 페이지 모바일 레이아웃 (Medium)
- "지도를 불러오는 중..." 텍스트 세로 줄바꿈
- 하단 탭바와 지도 컨트롤 겹침

### 9. 신고가/오늘거래 테이블 → 모바일 카드 (High)
- 순위/단지명/지역/면적/거래가/거래일 6컬럼이 모바일에서 읽기 불가능
- 카드형 리스트로 전환: 순위+단지명+가격 한 줄, 지역+면적+날짜 두번째 줄

### Claude's Discretion
- 구체적인 CSS breakpoint (기존 tailwind 설정 따름)
- 카드 레이아웃 세부 디자인 (기존 스타일 변수 활용)
- 애니메이션/트랜지션 (기존 패턴 유지)

</decisions>

<canonical_refs>
## Canonical References

### UI 패턴
- `src/app/globals.css` — CSS 변수, 테마 색상
- `src/components/layout/MobileNav.tsx` — 모바일 메뉴 컴포넌트
- `src/app/layout.tsx` — 루트 레이아웃

### 테이블 컴포넌트
- `src/app/today/page.tsx` — 오늘의 거래 테이블
- `src/app/new-highs/page.tsx` — 신고가 테이블
- `src/components/apt/TransactionTabs.tsx` — 아파트 상세 거래 테이블

### 차트
- `src/components/charts/PriceHistoryChart.tsx` — 가격 추이 차트
- `src/components/apt/AptDetailClient.tsx` — 면적 선택 UI

### 금리
- `src/app/rate/page.tsx` — 금리 현황

### 스크린샷
- `모바일웹화면캡쳐/` — 12장 모바일 캡처

</canonical_refs>

<specifics>
## Specific Ideas

- 테이블 → 카드 전환은 `md:` breakpoint 기준 (768px)
- 카드 내부는 기존 CSS 변수(--color-surface-card, --color-border 등) 사용
- 면적 칩은 `overflow-x-auto whitespace-nowrap` 수평 스크롤

</specifics>

<deferred>
## Deferred Ideas

- 모바일 전용 바텀 네비게이션 (하단 탭바) — 별도 마일스톤
- PWA 앱 아이콘/스플래시 화면 개선
- 모바일 전용 다크모드 색상 조정

</deferred>

---

*Phase: 09-mobile-ui*
*Context gathered: 2026-03-27 via 모바일 스크린샷 분석*
