# 한국 부동산 오픈소스 프로젝트 종합 리서치 보고서

> 조사일: 2026-03-23
> 조사 범위: GitHub, NPM, PyPI
> 총 발견 프로젝트: 40+ 개 (유의미한 프로젝트 기준)

---

## 목차

1. [핵심 프로젝트 요약 (Top 10)](#핵심-프로젝트-요약-top-10)
2. [카테고리 1: 데이터 수집 (라이브러리/API 래퍼)](#카테고리-1-데이터-수집-라이브러리api-래퍼)
3. [카테고리 2: MCP 서버 (Model Context Protocol)](#카테고리-2-mcp-서버-model-context-protocol)
4. [카테고리 3: 크롤링/스크래핑](#카테고리-3-크롤링스크래핑)
5. [카테고리 4: 데이터 분석/시각화](#카테고리-4-데이터-분석시각화)
6. [카테고리 5: ML/AI 가격 예측](#카테고리-5-mlai-가격-예측)
7. [카테고리 6: 풀스택 애플리케이션](#카테고리-6-풀스택-애플리케이션)
8. [카테고리 7: 지도 기반 서비스](#카테고리-7-지도-기반-서비스)
9. [카테고리 8: 브라우저 확장/유틸리티](#카테고리-8-브라우저-확장유틸리티)
10. [카테고리 9: AI/LLM 기반 부동산 서비스](#카테고리-9-aillm-기반-부동산-서비스)
11. [donjup 적용 전략 요약](#donjup-적용-전략-요약)

---

## 핵심 프로젝트 요약 (Top 10)

| 순위 | 프로젝트 | Stars | 핵심 가치 | donjup 활용도 |
|------|----------|-------|-----------|--------------|
| 1 | PublicDataReader | 555 | 한국 공공데이터 Python 라이브러리 (부동산 포함) | ★★★★★ |
| 2 | real-estate-mcp | 329 | 국토부 API 기반 MCP 서버 | ★★★★★ |
| 3 | python-real-estate (교재) | 67 | 부동산 데이터 분석 교재 예제코드 | ★★★☆☆ |
| 4 | zillow-mcp-server | 32 | MCP 서버 아키텍처 참고 | ★★☆☆☆ |
| 5 | batchdata-mcp-real-estate | 28 | MCP + 부동산 데이터 통합 패턴 | ★★★☆☆ |
| 6 | real-estate-invest (f-lab) | 14 | 부동산 매매가 비교 시스템 (Java) | ★★★☆☆ |
| 7 | korea_real_estate_analysis | 7 | 부동산 데이터 분석 코드/데이터셋 | ★★★☆☆ |
| 8 | lansbot (네이버 부동산 크롤링) | 6 | Scrapy 기반 네이버 부동산 크롤러 | ★★★★☆ |
| 9 | ko-apt-price | 4 | 아파트 실거래가/전세가 (R) | ★★☆☆☆ |
| 10 | HogangNoNoLogin | 4 | 호갱노노 클론 (C#/MAUI) | ★★☆☆☆ |

---

## 카테고리 1: 데이터 수집 (라이브러리/API 래퍼)

### 1-1. PublicDataReader ★★★★★

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/WooilJeong/PublicDataReader |
| **Stars** | 555 |
| **최종 업데이트** | 2026-03-19 (활발히 유지보수 중) |
| **언어/프레임워크** | Python |
| **라이선스** | MIT |
| **PyPI** | `pip install PublicDataReader` |

**설명**: 한국 공공 데이터 조회를 위한 대표적인 오픈소스 Python 라이브러리. 공공데이터포털, KOSIS(통계청), 한국은행 ECOS 등 다양한 공공 API를 통합 제공.

**핵심 기능**:
- 국토교통부 부동산 실거래가 조회 (아파트/오피스텔/연립다세대/단독다가구/토지/분양권)
- 매매/전월세 거래 데이터 조회
- 건축물대장 조회
- 토지소유정보 조회
- 소규모상가 정보
- KOSIS 통계 데이터 (미분양, 전세가율 등)
- 한국은행 ECOS 경제 통계

**donjup 적용**:
- **핵심 데이터 소스로 즉시 활용 가능**
- 실거래가 데이터를 가져와 donjup의 "돈 되는 집" 분석에 직접 활용
- KOSIS 미분양 데이터로 시장 분석 기능 강화
- API 키만 있으면 바로 사용 가능

---

### 1-2. korea-public-data

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/lee-lou2/korea-public-data |
| **Stars** | 미확인 (소규모) |
| **언어/프레임워크** | Python |

**설명**: 공공 데이터를 간편히 조회할 수 있는 파이썬 라이브러리. PublicDataReader의 경량 대안.

**donjup 적용**: PublicDataReader 대비 기능이 제한적이나 참고용으로 활용 가능.

---

### 1-3. PublicDataReader-R

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/WooilJeong/PublicDataReader-R |
| **Stars** | 0 |
| **언어/프레임워크** | R |

**설명**: PublicDataReader의 R 버전. R 기반 분석이 필요한 경우 참고.

---

## 카테고리 2: MCP 서버 (Model Context Protocol)

### 2-1. real-estate-mcp ★★★★★

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/tae0y/real-estate-mcp |
| **Stars** | 329 |
| **최종 업데이트** | 2026-03-22 (매우 활발) |
| **언어/프레임워크** | Python |
| **라이선스** | 미확인 |

**설명**: 국토교통부 공공 API를 활용하여 Claude에게 한국 아파트 가격을 질문할 수 있는 MCP 서버. 한국 부동산 MCP 분야에서 가장 인기 있는 프로젝트.

**핵심 기능 (14+ 도구)**:
- `get_apartment_trades` / `get_apartment_rent` - 아파트 매매/임대
- 오피스텔 매매/임대 조회
- 연립다세대(빌라) 매매/임대 조회
- 단독주택 매매/임대 조회
- 상업용 부동산 매매/임대 조회
- 아파트 청약 정보 조회
- 공매 정보 조회
- Claude Desktop / Claude.ai 연동 지원

**donjup 적용**:
- **MCP 서버 아키텍처를 그대로 참고하여 donjup MCP 기능 구현 가능**
- 국토부 API 연동 패턴 학습
- Claude/AI 에이전트와의 통합 방식 참고
- 도구 정의 방식 벤치마킹

---

### 2-2. korean-capital-gains-tax-mcp

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/pchuri/korean-capital-gains-tax-mcp |
| **Stars** | 2 |
| **최종 업데이트** | 2026-03-19 |
| **언어/프레임워크** | TypeScript |

**설명**: 한국 부동산 양도소득세 계산기 MCP 서버.

**핵심 기능**:
- 부동산 양도소득세 자동 계산
- MCP 프로토콜 기반 AI 연동

**donjup 적용**:
- 양도소득세 계산 기능을 donjup에 통합하면 "수익성 분석" 기능에 직접 활용 가능
- TypeScript 기반이라 Next.js 프로젝트에 호환성 높음

---

### 2-3. korean-public-data-mcp

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/SongT-50/korean-public-data-mcp |
| **Stars** | 0 |
| **최종 업데이트** | 2026-03-08 |
| **언어/프레임워크** | Python |

**설명**: 한국 공공데이터 5개를 AI에게 연결하는 MCP 서버 (날씨, 부동산 실거래가, 대기질, 경제통계, 사업자조회).

**donjup 적용**: 부동산 + 경제통계를 함께 조회하는 패턴 참고 가능.

---

### 2-4. naver-land-mcp

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/kimduksoo/naver-land-mcp |
| **Stars** | 1 |
| **최종 업데이트** | 2026-03-09 |
| **언어/프레임워크** | Python |

**설명**: 네이버 부동산 매물 조회 MCP 서버.

**donjup 적용**: 네이버 부동산 매물 데이터를 AI로 분석하는 패턴 참고.

---

### 2-5. 해외 MCP 참고 프로젝트

| 프로젝트 | Stars | 설명 | 참고 포인트 |
|----------|-------|------|------------|
| [zillow-mcp-server](https://github.com/sap156/zillow-mcp-server) | 32 | Zillow MCP 서버 | MCP 서버 아키텍처 참고 |
| [batchdata-mcp-real-estate](https://github.com/zellerhaus/batchdata-mcp-real-estate) | 28 | BatchData.io 부동산 MCP (TypeScript) | TS 기반 MCP 구현 참고 |
| [real-estate-mcp (agentic-ops)](https://github.com/agentic-ops/real-estate-mcp) | 27 | 범용 부동산 MCP 데모 | MCP 통합 패턴 참고 |

---

## 카테고리 3: 크롤링/스크래핑

### 3-1. lansbot (네이버 부동산 크롤링)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/azoci/lansbot |
| **Stars** | 6 |
| **최종 업데이트** | 2025-03 |
| **언어/프레임워크** | Python (Scrapy + Elasticsearch) |

**설명**: Scrapy 기반 네이버 부동산 크롤러. Elasticsearch 연동.

**donjup 적용**: 네이버 부동산 매물 크롤링 구조 참고. 검색엔진 연동 패턴 학습.

---

### 3-2. landCrawling (네이버 부동산 크롤링)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/parkbsn1/landCrawling |
| **Stars** | 4 |
| **최종 업데이트** | 2025-07 |
| **언어/프레임워크** | Python |

**설명**: 네이버 부동산 크롤링.

---

### 3-3. naver_real_estate_crawler

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/Seeyong/naver_real_estate_crawler |
| **Stars** | 3 |
| **언어/프레임워크** | Jupyter Notebook (Python) |

**설명**: 네이버 부동산 정보 크롤러.

---

### 3-4. naverland-scrapper

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/twbeatles/naverland-scrapper |
| **Stars** | 2 |
| **최종 업데이트** | 2026-03-21 (최신) |
| **언어/프레임워크** | Python |

**설명**: 네이버 부동산 스크래퍼 (매매, 전세, 월세 가격 스크래핑).

**donjup 적용**: 매물 가격 수집 자동화 참고. 최신 네이버 부동산 API 구조 파악.

---

### 3-5. naver_real_estate_crawling_code

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/godo129/naver_real_estate_crawling_code |
| **Stars** | 2 |
| **언어/프레임워크** | Jupyter Notebook |

**설명**: 네이버 부동산 크롤링 코드.

---

### 3-6. hogangnono-review_crawling

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/abcdefGPT-chambit/hogangnono-review_crawling |
| **Stars** | 0 |
| **언어/프레임워크** | Python |

**설명**: 호갱노노 아파트 리뷰 크롤링 및 전처리.

**donjup 적용**: 아파트 리뷰/평판 데이터 수집 패턴 참고.

---

## 카테고리 4: 데이터 분석/시각화

### 4-1. python-real-estate (교재 예제코드)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/wikibook/python-real-estate |
| **Stars** | 67 |
| **최종 업데이트** | 2025-03 |
| **언어/프레임워크** | Jupyter Notebook (Python) |

**설명**: 위키북스 출판 <<파이썬을 활용한 부동산 데이터 분석>> 교재의 예제 코드.

**핵심 기능**:
- 부동산 공공데이터 수집 방법
- Pandas를 활용한 데이터 처리
- 시각화 (matplotlib, folium)
- 지역별 가격 분석

**donjup 적용**: 부동산 데이터 분석 기법/시각화 방법론 학습에 유용.

---

### 4-2. korea_real_estate_analysis

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/haven-jeon/korea_real_estate_analysis |
| **Stars** | 7 |
| **최종 업데이트** | 2023-08 |
| **언어/프레임워크** | R, HTML |

**설명**: 부동산 데이터 분석 코드 및 데이터. 한국 부동산 시장의 초기 분석 프로젝트 중 하나.

---

### 4-3. apt-trade-info (inasie)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/inasie/apt-trade-info |
| **웹사이트** | https://inasie.github.io/apt-trade-info/ |
| **Stars** | 0 (Forks: 5) |
| **언어/프레임워크** | SCSS (Jekyll/GitHub Pages) |

**설명**: 매일 업데이트되는 아파트 실거래가 정보 제공 사이트. GitHub Pages로 운영.

**핵심 기능**:
- 신규 등록 실거래가 목록
- 최근 5년간 거래량 추이
- 전국 거래량 상위 50 지역/아파트
- 신도시별 실거래 데이터

**donjup 적용**: 정적 사이트 기반 부동산 정보 제공 모델 참고. 데이터 업데이트 자동화 방식 학습.

---

### 4-4. RealEstate_BigData_Analysis_Project

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/ddolsoon/RealEstate_BigData_Analysis_Project |
| **Stars** | 1 |
| **언어/프레임워크** | Jupyter Notebook |

**설명**: 국토교통부 아파트/오피스텔 실거래가 빅데이터 분석 프로젝트.

---

## 카테고리 5: ML/AI 가격 예측

### 5-1. ML-WebAPI-apartment_price_prediction_program

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/comsa33/ML-WebAPI-apartment_price_prediction_program |
| **Stars** | 2 |
| **언어/프레임워크** | Python (Flask, MongoDB, Heroku) |

**설명**: ML 기반 광명시 아파트 예상가격 예측 프로그램. 웹 API로 서비스.

**핵심 기능**:
- 아파트 가격 예측 ML 모델
- Flask 웹 API
- MongoDB Atlas 데이터 저장
- Metabase 시각화

**donjup 적용**: ML 기반 가격 예측 → donjup "가격 전망" 기능에 모델 구조 참고.

---

### 5-2. apartment_price_prediction_WebAPP

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/Sinduda/apartment_price_prediction_WebAPP |
| **Stars** | 1 |
| **언어/프레임워크** | HTML, Python |

**설명**: 다중선형회귀 모델을 통한 서울 아파트 가격 예측 웹앱.

---

### 5-3. DaCrew4_MonthCrew-Predict_APT_Price

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/0525hhgus/DaCrew4_MonthCrew-Predict_APT_Price |
| **Stars** | 2 |
| **언어/프레임워크** | Jupyter Notebook |

**설명**: 데이콘 아파트 실거래가 예측 프로젝트.

---

### 5-4. Korean-Real-Estate-Project

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/CY-HYUN/Korean-Real-Estate-Project |
| **Stars** | 0 |
| **언어/프레임워크** | Jupyter Notebook |

**설명**: AI 기반 서울 부동산 분석 - 800K 매물, GDP/금리 상관관계, Folium 지도, ROI 예측.

**donjup 적용**: GDP/금리와 부동산 가격의 상관관계 분석 모델 참고.

---

### 5-5. homesignalAI

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/soeunyim-art/homesignalAI |
| **Stars** | 0 |
| **최종 업데이트** | 2026-03-21 (최신) |
| **언어/프레임워크** | TypeScript |

**설명**: 아파트 매물 시세 예측. TypeScript 기반.

**donjup 적용**: TypeScript 기반 시세 예측이므로 Next.js 프로젝트와의 호환성 검토.

---

## 카테고리 6: 풀스택 애플리케이션

### 6-1. real-estate-invest (f-lab)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/f-lab-edu/real-estate-invest |
| **Stars** | 14 |
| **최종 업데이트** | 2025-09 (archived) |
| **언어/프레임워크** | Java |

**설명**: 부동산 매매가 비교 시스템. f-lab 교육 프로그램에서 제작. 우아한형제들/두나무 합격 프로젝트.

**donjup 적용**: 시스템 설계 패턴 참고 (대규모 데이터 처리, 비교 알고리즘).

---

### 6-2. HappyHouse (SSAFY)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/SSAFY7-16-7/HappyHouse |
| **Stars** | 0 (Forks: 3) |
| **언어/프레임워크** | SCSS (Vue + Spring) |

**설명**: 공공데이터 API 활용 아파트 실거래가 조회 서비스. SSAFY 관통 1등 수상.

---

### 6-3. WhereIsMyHome

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/jaehui327/WhereIsMyHome |
| **Stars** | 2 |
| **언어/프레임워크** | CSS (Vue + Spring) |

**설명**: 국토교통부 실거래가 데이터 기반 지도 조회 + 주변 상권 정보 검색 서비스.

**donjup 적용**: 실거래가 + 상권 정보 결합 패턴 참고.

---

### 6-4. zipchack-api (집착)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/zipchack/zipchack-api |
| **Stars** | 3 |
| **최종 업데이트** | 2025-05 |
| **언어/프레임워크** | Java |

**설명**: 입지 기반 부동산 정보 제공 사이트 "집착" API.

**donjup 적용**: 입지 분석 기반 부동산 정보 서비스 모델 참고.

---

### 6-5. hogang-yes-api (호갱예스)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/dsadara/hogang-yes-api |
| **Stars** | 2 |
| **언어/프레임워크** | Java |

**설명**: 부동산 데이터 조회 API (호갱예스). 호갱노노 유사 서비스.

---

### 6-6. aptner

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/gguloadoong/aptner |
| **Stars** | 0 |
| **최종 업데이트** | 2026-03-21 (최신) |
| **언어/프레임워크** | TypeScript |

**설명**: 아파트 중심 부동산 서비스 - 청약정보 + 실거래가 + 핫한 단지 시각화 (호갱노노/아실 스타일).

**donjup 적용**: **donjup과 직접 경쟁/참고 대상**. TypeScript 기반, 청약+실거래가+인기단지 결합 모델 매우 유사.

---

### 6-7. hositamtam

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/getbravelee/hositamtam |
| **Stars** | 0 |
| **최종 업데이트** | 2025-07 |
| **언어/프레임워크** | Vue |

**설명**: 전국 아파트 매매/전세/월세 데이터 공유 부동산 플랫폼.

---

### 6-8. real-estate-data-portal

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/BudongJW/real-estate-data-portal |
| **Stars** | 0 |
| **최종 업데이트** | 2025-12 |
| **언어/프레임워크** | TypeScript |

**설명**: 한국 부동산 실거래/전세/가격지수 데이터 조회 및 시각화 오픈 데이터 플랫폼.

---

### 6-9. real-estate-aggregator

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/parkjs1362/real-estate-aggregator |
| **Stars** | 0 |
| **최종 업데이트** | 2026-02 |
| **언어/프레임워크** | TypeScript |

**설명**: 한국 부동산 데이터 집계 플랫폼 - 실거래가와 매물 정보를 한 곳에서.

**donjup 적용**: 데이터 집계 패턴이 donjup 비전과 유사.

---

## 카테고리 7: 지도 기반 서비스

### 7-1. GHIBURI (집우리)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/Muring/GHIBURI |
| **Stars** | 0 |
| **언어/프레임워크** | Vue |

**설명**: 카카오 지도 API와 아파트 매매 실거래 API를 활용한 부동산 웹 플랫폼.

**donjup 적용**: 카카오맵 + 실거래 데이터 결합 UI/UX 참고.

---

### 7-2. real-estate-price-map

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/profoundsea25/real-estate-price-map |
| **Stars** | 0 |
| **최종 업데이트** | 2025-05 |
| **언어/프레임워크** | Kotlin |

**설명**: 투자를 위한 부동산 시세 지도 만들기 (Cursor 활용).

---

### 7-3. seoul-estate

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/shxx2/seoul-estate |
| **Stars** | 0 |
| **최종 업데이트** | 2026-03-13 (최신) |
| **언어/프레임워크** | TypeScript |

**설명**: 서울 지역 부동산 매물 지도 검색 서비스.

---

### 7-4. find-my-house

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/glowforever96/find-my-house |
| **Stars** | 0 |
| **최종 업데이트** | 2026-03-05 |
| **언어/프레임워크** | TypeScript |

**설명**: 서울 25개 구별 아파트 매매 실거래가 시세 조회 서비스 (국토교통부 실거래가 API 기반).

---

### 7-5. zippt (AI 부동산 플랫폼)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/ssafy-zippt-team/zippt-frontend-project |
| **Stars** | 0 |
| **최종 업데이트** | 2025-05 |
| **언어/프레임워크** | Vue |

**설명**: AI를 접목시킨 지도 기반 부동산 웹 플랫폼.

---

## 카테고리 8: 브라우저 확장/유틸리티

### 8-1. naver-land-filter-extension

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/MinHeum/naver-land-filter-extension |
| **Stars** | 1 |
| **최종 업데이트** | 2025-08 |
| **언어/프레임워크** | JavaScript |

**설명**: 네이버 부동산 지도에서 추가 필터링 기능을 제공하는 Chrome 확장 프로그램.

---

### 8-2. naver-land-real-pyungso

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/KYankee6/naver-land-real-pyungso |
| **Stars** | 1 |
| **언어/프레임워크** | JavaScript |

**설명**: 네이버 부동산 실평수 정렬 크롬 확장자.

---

### 8-3. MoaAPT

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/likemed/MoaAPT |
| **Stars** | 2 |
| **언어/프레임워크** | PHP |

**설명**: 네이버, 호갱노노 매물 모아 보기.

**donjup 적용**: 여러 부동산 플랫폼 데이터를 통합하는 아이디어 참고.

---

### 8-4. 전세/월세 비교 계산기류

| 프로젝트 | Stars | 설명 |
|----------|-------|------|
| [rentcheck](https://github.com/alswp006/rentcheck) | 0 | 전세/월세/매매 10년 순자산 비교 시뮬레이터 (TypeScript) |
| [tax-tools](https://github.com/Tenandone/tax-tools) | 0 | 부가세 계산기 + 전세/월세 비교 계산기 |
| [tenant-navigator](https://github.com/maxmini0214/tenant-navigator) | 0 | 임차인 권리 진단 도구 - 전세/월세 보증금 반환 절차 안내 |

---

## 카테고리 9: AI/LLM 기반 부동산 서비스

### 9-1. real-estate-agent (LangGraph + RAG)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/taecode/real-estate-agent |
| **Stars** | 0 |
| **최종 업데이트** | 2026-03-13 (최신) |
| **언어/프레임워크** | Jupyter Notebook (Python) |

**설명**: 부동산 매물 분석 Multi-Agent (LangGraph + Pinecone RAG + 국토부 API).

**donjup 적용**: **LLM 기반 부동산 분석 에이전트 아키텍처 참고. RAG + 국토부 API 결합 패턴 매우 유용.**

---

### 9-2. real-estimate-AI

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/kwon416/real-estimate-AI |
| **Stars** | 0 |
| **최종 업데이트** | 2026-01 |
| **언어/프레임워크** | HTML (Python) |

**설명**: Python RAG LangChain + 부동산 통계 정보 Open API 챗봇.

**donjup 적용**: 부동산 챗봇 구현 패턴 참고.

---

### 9-3. smart-house-ai-api

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/leodev901/smart-house-ai-api |
| **Stars** | 0 |
| **최종 업데이트** | 2026-02 |

**설명**: LLM 모델을 활용한 부동산 중개업 서비스 업무 AI Agent 백엔드 서비스.

---

### 9-4. claude-agents (호갱노노 크롤러 + 부동산 분석기)

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/pyh9965/claude-agents |
| **Stars** | 0 |
| **최종 업데이트** | 2026-02 |
| **언어/프레임워크** | HTML |

**설명**: Claude Code 에이전트 모음 - 호갱노노 크롤러, 부동산 분석기, 콘텐츠 마케팅 팀 등.

---

### 9-5. Cheongju-Real-Estate-Insight-project

| 항목 | 내용 |
|------|------|
| **GitHub** | https://github.com/Open-300IQ/Cheongju-Real-Estate-Insight-project |
| **Stars** | 0 |
| **언어/프레임워크** | HTML |

**설명**: 청주 부동산 실거래가 데이터 기반 분석 및 AI 어드바이저 플랫폼.

---

## donjup 적용 전략 요약

### 즉시 활용 가능 (High Priority)

| 프로젝트 | 활용 방안 |
|----------|----------|
| **PublicDataReader** (555★) | 국토부 실거래가/전월세/건축물대장 데이터 수집의 핵심 도구. Python 백엔드 또는 데이터 파이프라인에서 활용. |
| **real-estate-mcp** (329★) | MCP 서버 아키텍처 참고. 14+ 도구 정의 방식을 donjup AI 기능에 적용. |
| **korean-capital-gains-tax-mcp** (2★) | 양도소득세 계산 로직을 donjup "수익 시뮬레이션" 기능에 통합. TypeScript 호환. |

### 아키텍처/패턴 참고 (Medium Priority)

| 프로젝트 | 참고 포인트 |
|----------|------------|
| **aptner** | 청약+실거래가+인기단지 결합 UI/UX. donjup과 가장 유사한 비전. |
| **real-estate-agent** (LangGraph+RAG) | LLM Multi-Agent 부동산 분석 아키텍처. |
| **apt-trade-info** (inasie) | 자동 업데이트 실거래가 정보 사이트 운영 모델. |
| **real-estate-aggregator** | 실거래가 + 매물 데이터 통합 패턴. |
| **batchdata-mcp-real-estate** (28★) | TypeScript MCP 서버 구현 참고. |

### 데이터/분석 참고 (Low Priority)

| 프로젝트 | 참고 포인트 |
|----------|------------|
| **python-real-estate** (67★) | 부동산 데이터 분석 방법론/시각화 기법 |
| **korea_real_estate_analysis** (7★) | R 기반 부동산 데이터 분석 코드/데이터셋 |
| **lansbot** (6★) | Scrapy 기반 네이버 부동산 크롤링 패턴 |

### 핵심 기술 스택 권장사항

1. **데이터 수집**: PublicDataReader (Python) → Next.js API Routes에서 Python 스크립트 호출 또는 별도 데이터 파이프라인
2. **MCP 통합**: real-estate-mcp 패턴을 참고하여 donjup 전용 MCP 서버 구축
3. **세금 계산**: korean-capital-gains-tax-mcp 로직 활용
4. **AI 분석**: LangGraph + RAG 패턴으로 부동산 AI 어드바이저 구현
5. **지도 연동**: 카카오맵 API + 실거래 데이터 오버레이

---

## 참고 링크

### 검색 출처
- [GitHub Topics: real-estate](https://github.com/topics/real-estate)
- [GitHub Topics: realestate](https://github.com/topics/realestate)
- [awesome-real-estate (curated list)](https://github.com/etewiah/awesome-real-estate)
- [PublicDataReader PyPI](https://pypi.org/project/PublicDataReader/)
- [PublicDataReader 공식 문서](https://wooiljeong.github.io/python/public_data_reader_01/)
- [real-estate-mcp 설정 가이드](https://github.com/tae0y/real-estate-mcp/blob/main/docs/setup-claude-web.md)

### NPM 패키지
- 한국 부동산 전용 NPM 패키지는 현재 거의 없음
- `@minjunkwon/houselotto-mcp-server` - 청약홈 API MCP 서버가 유일하게 발견됨

### PyPI 패키지
- `PublicDataReader` - 한국 공공데이터 조회 라이브러리 (가장 성숙한 패키지)
