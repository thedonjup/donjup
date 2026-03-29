<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 코딩 원칙
- 단일 책임 / DRY / KISS
- camelCase(변수·함수) / PascalCase(클래스) / UPPER_SNAKE_CASE(상수) / kebab-case(파일)
- 시스템 경계(사용자 입력·외부 API)에서만 에러 검증
- 미사용 import·변수·하드코딩 금지
- 새 기능엔 테스트 동반 (동작 검증)

# 검토 체크리스트
- 불필요한 주석/docstring 없는가
- 미사용 import/변수 없는가
- 하드코딩된 값 없는가
- OWASP Top 10 취약점 체크
