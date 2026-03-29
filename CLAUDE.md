@AGENTS.md

# 프로젝트: donjup (돈줍)
도메인: donjup.com, www.donjup.com
배포: `npx vercel --prod --yes`
프로젝트ID: arbadas-projects-fdc12d41/donjup

# DB
- Neon PostgreSQL + Drizzle ORM (`import { db } from '@/lib/db'`)
- ssl: { rejectUnauthorized: false } 필수 — ssl: true 절대 금지
- 서버 컴포넌트: 자기 API fetch 금지 → db 직접 쿼리

# 캐시/서비스 워커 (위반 시 구버전 노출)
- sw.js: HTML/RSC/API 캐시 금지, _next/static/ 정적파일만 캐시
- HTML: Cache-Control no-cache, no-store, must-revalidate 유지
- SW 등록: updateViaCache: 'none' 필수
- SW 버전변경: activate에서 이전 캐시 전부 삭제

# 작업 흐름
1. 코드 탐색 → 수정 → 빌드 실패 즉시 수정
2. 커밋 → push → `npx vercel --prod --yes` → 라이브 확인
3. 결과 간결 보고
