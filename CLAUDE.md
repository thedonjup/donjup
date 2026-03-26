@AGENTS.md

# GSD Mode (Get Shit Done)

## 원칙
- 묻지 말고 실행해. 판단이 서면 바로 코드 치고 배포까지.
- 설명은 최소. 결과로 말해.
- 에러 나면 즉시 디버깅 → 수정 → 재배포. 루프 돌지 말고 원인부터 파악.
- 병렬 가능한 건 전부 병렬 (Agent 적극 활용).
- 커밋하면 바로 push + `npx vercel --prod --yes`. 끊김 없이.

## 작업 흐름
1. 요청 받으면 → 바로 코드 읽기/탐색 시작
2. 수정 필요하면 → 바로 수정
3. 빌드 → 실패하면 즉시 고침
4. 커밋 → push → 배포 → 라이브 확인
5. 결과만 간결히 보고

## 금지
- "~할까요?", "~하시겠습니까?" 같은 확인 질문 (파괴적 작업 제외)
- 긴 설명, 배경 지식 나열
- 이미 아는 걸 반복 설명
- 작업 안 하고 계획만 늘어놓기

## 배포
- Vercel 프로젝트: arbadas-projects-fdc12d41/donjup
- 도메인: donjup.com, www.donjup.com
- 배포 명령: `npx vercel --prod --yes`
- git push 후 자동 배포도 동작하지만, CLI 배포가 도메인에 직접 연결됨
- DB: CockroachDB (ssl: { rejectUnauthorized: false } 필수 — ssl: true로 바꾸면 연결 끊김)

## 캐시/서비스 워커 필수 규칙

**절대 위반 금지 — 위반 시 배포 후 사용자에게 이전 버전 보임**

1. **서비스 워커(sw.js)에서 HTML/RSC/API를 절대 캐시하지 말 것**
   - 캐시 가능: `_next/static/` (해시된 파일명), 이미지, 폰트
   - 캐시 금지: HTML, RSC 페이로드, API 응답, sw.js 자체
   - 이유: Next.js는 빌드마다 JS 번들 해시가 바뀜. HTML 캐시하면 이전 HTML이 존재하지 않는 JS를 참조 → 에러

2. **HTML 응답에 `Cache-Control: no-cache, no-store, must-revalidate` 헤더 유지**
   - next.config.ts에서 설정 중 (sw.js도 동일)

3. **SW 등록 시 `updateViaCache: 'none'` 필수**
   - layout.tsx 인라인 스크립트에서 `navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'})` 사용 중

4. **SW 버전 변경 시 activate에서 이전 캐시 전부 삭제**
   - `caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))`

5. **서버 컴포넌트에서 자기 자신 API를 fetch하지 말 것**
   - `VERCEL_URL`은 preview URL이라 production과 다름
   - 서버 컴포넌트에서는 직접 DB 쿼리 사용 (`getPool().query()`)

---

# Claude + Gemini 협업 하네스

## 1. 작업 라우팅 규칙

```yaml
routing:
  # ── Gemini 위임 조건 ──
  gemini_delegate:
    tool: mcp__gemini__generate_text  # Gemini MCP 도구
    conditions:
      - type: code
        rule: "단일 파일, 50줄 이하 스크립트/스니펫 작성"
      - type: text
        rule: "마크다운, README, 설명문 등 단순 텍스트 문서 작성"
      - type: content_draft
        rule: "문서 섹션/슬라이드별 텍스트 초안 작성"
      - type: transform
        rule: "요약, 번역, 톤 변환, 표/리스트 정리"
      - type: qa
        rule: "단순 질문 답변, 간단한 코드 설명"
    context_requirement: >
      Gemini에게 위임 시 반드시 포함할 정보:
      목적, 대상 독자, 톤/스타일, 분량, 포맷 예시

  # ── Claude 직접 처리 ──
  claude_direct:
    coding:
      - "여러 파일 리팩토링"
      - "코드 분석, 탐색, 디버깅"
      - "테스트 작성 및 실행"
      - "Git 작업 (커밋, 브랜치, PR)"
      - "시스템 명령어 실행"
      - "파일 편집 (Edit 도구)"
      - "복잡한 아키텍처 설계"
      - "보안 관련 작업"
    document:
      - "문서 구조 설계 및 목차 구성"
      - "스킬 도구 호출 (pptx, docx, xlsx, pdf)"
      - "서식, 레이아웃, 디자인 적용"
      - "문서 병합/분할"
      - "Google Drive 파일 검색 및 참조"
      - "기존 문서 읽기, 분석, 수정"
      - "최종 품질 검수 및 사용자 전달"

  # ── Gemini 모델 자동 선택 ──
  gemini_model_selection:
    short_request: # 200자 이하
      model: gemini-2.0-flash
      reason: "빠르고 저렴"
    long_request: # 200자 초과 또는 코드 포함
      model: gemini-2.5-flash
      reason: "더 높은 추론 능력"
```

## 2. 작업별 품질 기준

```yaml
quality_standards:

  # ── 코딩 ──
  coding:
    principles:
      - "단일 책임 원칙: 함수/클래스는 하나의 역할만 담당"
      - "DRY: 동일 로직 반복 금지, 단 조기 추상화도 금지"
      - "KISS: 현재 요구사항에 필요한 최소 복잡도 유지"
      - "보안: OWASP Top 10 취약점 방지"
    naming:
      variables: camelCase
      functions: camelCase
      classes: PascalCase
      constants: UPPER_SNAKE_CASE
      files: kebab-case
    error_handling:
      - "시스템 경계(사용자 입력, 외부 API)에서만 검증"
      - "내부 코드/프레임워크 보장은 신뢰"
      - "에러 메시지는 디버깅에 유용하게 작성"
    testing:
      - "새 기능에는 테스트 동반"
      - "테스트는 동작(behavior)을 검증, 구현을 검증하지 않음"
    review_checklist:
      - "불필요한 주석/docstring 추가하지 않았는가"
      - "미사용 import/변수가 없는가"
      - "하드코딩된 값이 없는가"

  # ── PPT (pptx) ──
  pptx:
    structure:
      - "표지 → 목차 → 본문 → 요약/결론"
      - "슬라이드당 핵심 메시지 1개"
      - "텍스트는 키워드/짧은 문장 중심, 장문 금지"
    design:
      - "일관된 색상 팔레트 유지"
      - "폰트 종류 최대 2개"
      - "여백 충분히 확보, 슬라이드 과밀 금지"
    content_per_slide:
      max_bullet_points: 5
      max_words_per_bullet: 15
      recommended_slides: "10-15장 (10분 발표 기준)"
    workflow:
      step1: "Claude → 전체 구조/목차 설계"
      step2: "Gemini → 각 슬라이드 텍스트 초안 작성"
      step3: "Claude → pptx 스킬로 파일 생성, 디자인 적용"
      step4: "Claude → 전체 흐름 검수 및 수정"

  # ── Word 문서 (docx) ──
  docx:
    structure:
      - "제목 → 목차 → 서론 → 본문 → 결론"
      - "Heading 계층 구조 준수 (H1 > H2 > H3)"
      - "단락은 하나의 주제만 다룸"
    formatting:
      - "본문: 명확하고 간결한 문장"
      - "전문용어 사용 시 첫 등장에서 설명"
      - "표/그림에는 반드시 캡션 포함"
    tone_by_purpose:
      business_report: "객관적, 데이터 기반, 간결체"
      proposal: "설득적, 수혜자 관점, 구체적 수치"
      manual: "지시적, 단계별, 명확한 동사"
      general: "자연스럽고 읽기 쉬운 문체"
    workflow:
      step1: "Claude → 문서 구조/목차 설계, 톤 결정"
      step2: "Gemini → 각 섹션 텍스트 초안 작성"
      step3: "Claude → docx 스킬로 파일 생성, 서식 적용"
      step4: "Claude → 문맥 일관성 검수 및 수정"

  # ── 스프레드시트 (xlsx) ──
  xlsx:
    structure:
      - "첫 행은 명확한 헤더"
      - "데이터 타입 일관성 유지 (숫자/텍스트/날짜 혼용 금지)"
      - "시트별 명확한 목적 구분"
    formatting:
      - "숫자: 천단위 구분, 소수점 통일"
      - "날짜: YYYY-MM-DD 형식 통일"
      - "헤더 행 고정(freeze) 적용"
    formulas:
      - "수식은 가독성 우선, 중첩 최소화"
      - "참조 범위는 명확하게 지정"
    workflow:
      step1: "Claude → 시트 구조, 컬럼 설계"
      step2: "Gemini → 데이터 정리/변환 (필요 시)"
      step3: "Claude → xlsx 스킬로 파일 생성, 수식/서식 적용"

  # ── PDF ──
  pdf:
    operations:
      - "읽기/추출: 텍스트, 표, 이미지 추출"
      - "생성: 다른 포맷에서 변환 또는 새로 생성"
      - "편집: 병합, 분할, 회전, 워터마크"
      - "폼: PDF 폼 필드 채우기"
    workflow:
      step1: "Claude → 작업 유형 판단 및 실행 계획"
      step2: "Claude → pdf 스킬로 직접 처리"
      step3: "Gemini → 추출된 텍스트 요약/변환 (필요 시)"
```

## 3. 문서 작성 기본 설정

```yaml
document_defaults:

  # ── 언어 및 로케일 ──
  locale:
    language: "ko-KR"
    writing_system: "한국어 전용"
    date_format: "YYYY년 MM월 DD일"
    number_format: "천단위 쉼표 (1,000,000)"
    currency: "₩ (원)"

  # ── 문체 자동 판단 기준 ──
  tone_auto_select:
    경영진_보고: "격식체 (합니다/입니다)"
    공식_제안서: "격식체 (합니다/입니다)"
    내부_보고서: "간결체 (함/임)"
    회의록: "간결체 (함/임)"
    매뉴얼_가이드: "해요체 (해요/에요)"
    일반_문서: "사용자 지시에 따라 판단"
    rule: >
      사용자가 톤을 지정하지 않으면 문서 유형에 따라 위 기준으로 자동 선택.
      불확실하면 사용자에게 확인.

  # ── 파일 저장 ──
  output:
    base_path: "D:/Users/Documents/claude/output"
    naming_convention: "{문서유형}_{주제}_{YYYYMMDD}.{확장자}"
    naming_examples:
      - "보고서_분기실적_20260325.docx"
      - "제안서_신규사업_20260325.pptx"
      - "데이터_매출현황_20260325.xlsx"
    auto_create_dir: true

  # ── 문서 유형별 템플릿 구조 ──
  templates:

    업무_보고서:
      structure: ["제목", "요약(Executive Summary)", "현황", "분석", "향후 계획", "첨부"]
      tone: "간결체"
      tips:
        - "첫 페이지에 핵심 결론을 먼저 제시 (결론 선행)"
        - "데이터는 표/차트로 시각화"
        - "액션 아이템은 담당자/기한 명시"

    기획서_제안서:
      structure: ["표지", "목차", "배경/목적", "현황 분석", "제안 내용", "기대 효과", "일정/예산", "부록"]
      tone: "격식체"
      tips:
        - "문제 → 해결책 → 효과 흐름으로 설득력 구성"
        - "수치와 근거 데이터를 반드시 포함"
        - "예산은 항목별로 세분화"

    발표자료_PPT:
      structure: ["표지", "목차/아젠다", "본문 슬라이드", "요약", "Q&A"]
      tone: "키워드 중심, 구어체 발표 노트"
      tips:
        - "1슬라이드 1메시지 원칙"
        - "텍스트보다 시각 자료(도표, 아이콘) 우선"
        - "발표 시간 기준: 슬라이드당 1-2분"
        - "speaker notes에 발표 스크립트 포함"

    회의록:
      structure: ["회의 정보(일시/참석자/안건)", "논의 내용", "결정 사항", "액션 아이템(담당/기한)"]
      tone: "간결체"
      tips:
        - "결정 사항과 액션 아이템을 최상단에 배치"
        - "논의 내용은 안건별로 구분"

    데이터_분석_보고서:
      structure: ["요약", "분석 목적", "데이터 출처/범위", "분석 결과", "인사이트", "제언"]
      tone: "격식체"
      tips:
        - "차트/그래프에 해석 코멘트 필수"
        - "원본 데이터는 별도 시트/부록으로 첨부"
        - "한계점과 전제 조건 명시"

  # ── 한국어 문서 작성 규칙 ──
  korean_writing_rules:
    spacing:
      - "단위와 숫자 사이 띄어쓰기: 100 만원, 30 %"
      - "외래어 표기법 준수"
    clarity:
      - "한 문장은 50자 이내 권장"
      - "이중부정 사용 금지 (명확한 긍정문으로)"
      - "주어-목적어-서술어 어순 명확히"
    professional:
      - "약어 첫 사용 시 풀네임 병기: AI(인공지능)"
      - "불필요한 영어 혼용 지양, 한국어 대체어 우선"
      - "존칭은 문서 톤에 맞게 일관되게 사용"

  # ── 시각 요소 기본값 ──
  visual_defaults:
    color_palette:
      primary: "#2B579A"    # 진한 파랑 (전문적)
      secondary: "#4472C4"  # 밝은 파랑
      accent: "#ED7D31"     # 주황 (강조)
      text: "#333333"       # 본문 텍스트
      background: "#FFFFFF" # 배경
    fonts:
      heading: "맑은 고딕"
      body: "맑은 고딕"
      code: "D2Coding"
    chart_style:
      - "범례는 차트 하단 배치"
      - "축 레이블 가독성 확보"
      - "데이터 레이블 표시 (값이 적을 때)"
```

## 4. 협업 원칙

```yaml
collaboration:
  principles:
    efficiency: "Gemini로 위임 가능한 텍스트 생성은 위임하여 속도 향상"
    quality: "최종 산출물의 조립과 검수는 반드시 Claude가 담당"
    authority: "파일 시스템 접근, 스킬 도구 호출, 외부 서비스 연동은 Claude만 수행"
    context: "Gemini 위임 시 충분한 맥락(목적, 톤, 대상, 분량)을 프롬프트에 포함"

  output_delivery:
    - "산출물은 사용자가 바로 사용 가능한 상태로 전달"
    - "파일 생성 시 경로와 파일명을 명확히 안내"
    - "대용량 작업은 중간 진행 상황을 사용자에게 공유"

  error_recovery:
    - "Gemini 응답 품질이 낮으면 Claude가 직접 재작성"
    - "스킬 도구 오류 시 대안 접근법을 즉시 시도"
    - "사용자에게 오류 상황과 해결 방안을 투명하게 공유"
```
