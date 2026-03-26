# QA 점검 리포트 - donjup.com

**점검일시:** 2026-03-25
**점검자:** QA Engineer (자동화)
**점검 방법:** curl SSR HTML 분석

---

## 요약

| 구분 | 건수 |
|------|------|
| 전체 점검 페이지 | 21 |
| OK | 18 |
| PARTIAL (경미한 이슈) | 2 |
| ERROR | 0 |
| EMPTY | 0 |
| API 점검 | 3 (모두 OK) |
| SEO 이슈 | 1 (치명적) |

---

## 1. 페이지별 점검 결과

### 1-1. https://donjup.com/ (메인)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 147,357 bytes
- **title:** `돈줍 DonJup - 부동산 실거래가 & 금리 대시보드`
- **데이터 샘플:** 거래, 아파트, 폭락, 신고가, 8000만, 2380만 등 실제 금액 데이터 확인
- **OG Image:** 전용 opengraph-image 사용 (정상)
- **Schema.org:** Organization 스키마 포함

### 1-2. https://donjup.com/today (오늘 거래)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 611,943 bytes (가장 큰 페이지 -- 거래 데이터 다량 포함)
- **title:** `오늘의 거래 | 돈줍`
- **데이터 샘플:** 18억, 11억, 13억, 14억, 15억, 17억, 25억, 32억, 40억, 41억 등 다양한 실거래가 확인
- **비고:** SSR로 거래 데이터가 풍부하게 렌더링됨

### 1-3. https://donjup.com/new-highs (신고가)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 170,583 bytes
- **title:** `오늘의 신고가 | 돈줍`
- **데이터 샘플:** 래미안, 자이, e편한세상, 푸르지오 등 아파트 브랜드명 + 가격 데이터 확인

### 1-4. https://donjup.com/market (지역별)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 124,913 bytes
- **title:** `전국 시도별 아파트 시세 - 폭락 순위 & 신고가 | 돈줍`
- **데이터 샘플:** 전국 17개 시도 데이터 포함

### 1-5. https://donjup.com/market/seoul (서울)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 161,066 bytes
- **title:** `서울특별시 시군구별 아파트 시세 - 2026년 3월 | 돈줍`
- **데이터 샘플:** 송파구, 강동구, 강남구, 성동구, 마포구, 서초구, 광진구, 용산구 등 시군구 데이터 확인

### 1-6. https://donjup.com/rent (전월세)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 177,999 bytes
- **title:** `전국 아파트 전월세 실거래가 | 돈줍`
- **데이터 샘플:** 전세, 월세, 보증금 데이터 확인

### 1-7. https://donjup.com/rate (금리)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 104,354 bytes
- **title:** `금리 현황 | 돈줍`
- **데이터 샘플:** 기준금리, COFIX, CD금리, 국고채 항목 및 수치(5.30, 2.5, 3.5 등) 확인

### 1-8. https://donjup.com/rate/calculator (계산기)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 56,096 bytes
- **title:** `대출 이자 계산기 | 돈줍`
- **비고:** 클라이언트 렌더링 위주 (인터랙티브 계산기)

### 1-9. https://donjup.com/trend (트렌드)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 79,882 bytes
- **title:** `부동산 시장 트렌드 | 돈줍`
- **데이터 샘플:** 거래량, 추이, 평균 등 키워드 확인

### 1-10. https://donjup.com/themes (테마)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 64,951 bytes
- **title:** `테마 컬렉션 - 투자 관점별 아파트 모아보기 | 돈줍`
- **데이터 샘플:** 재건축, 대단지, 신축, 폭락 매물 테마 확인

### 1-11. https://donjup.com/themes/reconstruction (재건축)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 134,099 bytes
- **title:** `재건축 임박 아파트 - 준공 30년 이상 단지 모음 | 돈줍`
- **데이터 샘플:** 재건축, 준공, 단지, 세대 데이터 확인
- **비고:** 이 페이지만 canonical URL이 정상 (`https://donjup.com/themes/reconstruction`)

### 1-12. https://donjup.com/compare (비교)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 59,842 bytes
- **title:** `돈줍 DonJup - 부동산 실거래가 & 금리 대시보드` (기본 타이틀 사용)
- **비고:** 클라이언트 렌더링 위주. "검색하여" 등 안내 문구 확인. 아파트 선택 전이라 데이터 없음은 정상.
- **[이슈]** title이 페이지 고유 타이틀이 아닌 기본 타이틀 사용

### 1-13. https://donjup.com/search?q=래미안 (검색)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 78,554 bytes
- **title:** `"래미안" 아파트 검색 결과 | 돈줍`
- **데이터 샘플:** 래미안 관련 아파트 검색 결과 다수 확인

### 1-14. https://donjup.com/map (지도)
- **HTTP:** 200
- **상태:** PARTIAL
- **페이지 크기:** 60,463 bytes
- **title:** `지도로 보는 실거래가 | 돈줍`
- **[이슈]** SSR HTML에 `"좌표가 있는 거래 데이터가 없습니다"` 메시지 포함
- **비고:** 지도는 클라이언트에서 렌더링되므로 초기 SSR에서 데이터 없는 것은 구조적으로 정상일 수 있으나, 사용자 경험 측면에서 빈 상태 메시지가 보일 수 있음

### 1-15. https://donjup.com/daily/archive (리포트)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 61,581 bytes
- **title:** `데일리 리포트 아카이브 | 돈줍`
- **데이터 샘플:** 데일리, 리포트, 아카이브, 2026 등 데이터 확인

### 1-16. https://donjup.com/profile (프로필)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 49,019 bytes
- **title:** `돈줍 DonJup - 부동산 실거래가 & 금리 대시보드` (기본 타이틀)
- **비고:** 비로그인 상태에서 "로그인 / 프로필" 안내 확인. 정상 동작.
- **[이슈]** title이 "내 프로필 | 돈줍" 등 고유 타이틀이 아닌 기본 타이틀 사용

### 1-17. https://donjup.com/about (소개)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 70,523 bytes
- **title:** `서비스 소개 | 돈줍`
- **데이터 샘플:** 돈줍, 서비스, 실거래가, 부동산, 데이터, 금리 등 콘텐츠 확인

### 1-18. https://donjup.com/privacy (개인정보)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 68,800 bytes
- **title:** `개인정보처리방침 | 돈줍`
- **데이터 샘플:** 개인정보, 수집, 이용, 보유, 처리 등 법률 문서 콘텐츠 확인

### 1-19. https://donjup.com/dam (관리자)
- **HTTP:** 200
- **상태:** OK
- **페이지 크기:** 49,819 bytes
- **title:** `돈줍 DonJup - 부동산 실거래가 & 금리 대시보드` (기본 타이틀)
- **비고:** 대시보드, 로그인 요소 확인. 비인증 상태에서 접근 차단 정상.
- **robots.txt에서 Disallow 처리됨 (정상)**

### 1-20. https://donjup.com/sitemap.xml
- **HTTP:** 200
- **상태:** OK
- **비고:** 유효한 XML 형식. 총 19개 URL 포함. lastmod: 2026-03-24. 모든 주요 페이지 포함.

### 1-21. https://donjup.com/robots.txt
- **HTTP:** 200
- **상태:** OK
- **내용:**
  ```
  User-Agent: *
  Allow: /
  Disallow: /api/
  Disallow: /dam/
  Sitemap: https://donjup.com/sitemap.xml
  Sitemap: https://donjup.com/apt/sitemap.xml
  ```

---

## 2. API 점검 결과

### 2-1. /api/search?q=래미안
- **상태:** OK
- **응답:** JSON 배열. 래미안 관련 아파트 다수 반환
- **데이터 샘플:** DMC래미안e편한세상(서대문구), 개포래미안포레스트(강남구), 공덕1삼성래미안(마포구) 등

### 2-2. /api/search?q=자이
- **상태:** OK
- **응답:** JSON 배열. 자이 관련 아파트 다수 반환
- **데이터 샘플:** DMC센트럴자이 1~4단지(은평구), DMC에코자이(서대문구), DMC파인시티자이(은평구) 등

### 2-3. /api/search?q=힐스테이트
- **상태:** OK
- **응답:** JSON 배열. 힐스테이트 관련 아파트 다수 반환
- **데이터 샘플:** 강남자곡 힐스테이트(강남구), 강변힐스테이트(마포구), 광장힐스테이트(광진구) 등

---

## 3. 발견된 이슈 (우선순위별)

### [심각] SEO: canonical URL 오류
- **영향:** 거의 모든 페이지
- **내용:** `/today`, `/new-highs`, `/market`, `/market/seoul`, `/rent`, `/rate`, `/rate/calculator`, `/trend`, `/themes`, `/compare`, `/search`, `/map`, `/daily/archive`, `/profile`, `/about`, `/privacy`, `/dam` 등 대부분의 페이지에서 `<link rel="canonical" href="https://donjup.com"/>` 으로 루트 URL을 가리키고 있음
- **예외:** `/themes/reconstruction`만 정상적으로 자기 자신의 URL을 canonical로 사용
- **영향도:** Google이 모든 페이지를 중복 콘텐츠로 판단하여 개별 페이지 색인을 거부할 수 있음. SEO에 치명적.
- **수정 제안:** 각 페이지에서 canonical URL을 해당 페이지의 실제 URL로 설정

### [경고] OG Image: 서브 페이지들이 logo.svg 사용
- **영향:** 메인 페이지 이외 모든 페이지
- **내용:** 메인 페이지만 전용 OG Image(`/opengraph-image?...`)를 사용하고, 나머지 페이지들은 `/logo.svg`를 사용
- **영향도:** SNS 공유 시 각 페이지별 미리보기 이미지가 동일하여 클릭율 저하 가능
- **수정 제안:** 주요 페이지별 OG Image 생성 (최소한 today, new-highs, market, rate)

### [경고] title 미설정 페이지
- **영향:** `/compare`, `/profile`, `/dam`
- **내용:** 이 3개 페이지에서 기본 title(`돈줍 DonJup - 부동산 실거래가 & 금리 대시보드`)을 사용
- **수정 제안:** 각각 "아파트 비교 | 돈줍", "내 프로필 | 돈줍", "관리자 | 돈줍" 등으로 변경

### [참고] 지도 페이지 초기 빈 상태
- **영향:** `/map`
- **내용:** SSR HTML에 "좌표가 있는 거래 데이터가 없습니다" 메시지 표시
- **영향도:** 클라이언트 JS 로드 후 데이터가 채워질 수 있으나, JS 비활성 환경이나 크롤러에서 빈 상태로 보임
- **수정 제안:** SSR에서 초기 데이터를 일부 포함하거나, 로딩 스켈레톤으로 대체

---

## 4. 정상 항목 체크리스트

| 항목 | 상태 |
|------|------|
| 모든 페이지 HTTP 200 | OK |
| 에러 메시지 없음 (Internal Server Error, ECONNREFUSED 등) | OK |
| 빈 페이지 없음 (모든 페이지 49KB 이상) | OK |
| SSR 데이터 렌더링 (today, new-highs, market, rent, rate) | OK |
| API 검색 정상 응답 (래미안, 자이, 힐스테이트) | OK |
| sitemap.xml 유효 | OK |
| robots.txt 정상 (api, dam 차단) | OK |
| Schema.org 구조화 데이터 | OK |
| PWA manifest | OK |
| 다크모드 지원 | OK |
| 접근성 (skip-to-content 링크) | OK |
| Google AdSense 태그 | OK |

---

## 5. 권장 조치 우선순위

1. **[즉시]** canonical URL 수정 -- SEO 치명적 이슈
2. **[단기]** compare, profile, dam 페이지 title 개선
3. **[중기]** 서브 페이지별 OG Image 생성
4. **[중기]** 지도 페이지 SSR 초기 데이터 또는 로딩 상태 개선
