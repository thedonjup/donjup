# Research Summary — 돈줍 사이트 안정화

## Stack Recommendations

| 영역 | 현재 | 권장 | 이유 |
|------|------|------|------|
| Rate Limiting | 인메모리 Map | Vercel WAF 또는 middleware + 간단 토큰 버킷 | 서버리스에서 인메모리는 무의미 |
| 검색 | ILIKE '%keyword%' | pg_trgm GIN 인덱스 | 인덱스 없이 순차 스캔 |
| 커넥션 풀 | max:5 | Neon pooler 활용 또는 max:10 | 크론잡 동시 실행 시 고갈 |
| 로깅 | console.log | 구조화 로깅 (서버 컴포넌트용 유틸) | 프로덕션 디버깅 불가 |
| 에러 추적 | 없음 | error.tsx + global-error.tsx | 사용자 경험 + 에러 파악 |
| SSL | rejectUnauthorized:false | true + CA 인증서 | MITM 취약점 |

## Feature Priority (Table Stakes)

1. **Critical**: canonical URL 버그 (SEO 파괴)
2. **Critical**: 에러 바운더리 없음
3. **High**: 페이지별 title/OG 미설정
4. **High**: 중복 코드 정리 (formatPrice, Instagram)
5. **High**: 미사용 패키지/Supabase 잔재 정리
6. **Medium**: 검색 성능 (pg_trgm)
7. **Medium**: 대형 컴포넌트 분할
8. **Medium**: TypeScript any 개선
9. **Medium**: 접근성 최소 기준
10. **Low→Last**: 보안 전체 점검 (마지막 페이즈)

## Architecture — 수정 순서 권장

1. SEO/메타데이터 (독립적, 리스크 낮음)
2. 코드 정리/리팩토링 (기반 정리)
3. 에러 핸들링/로깅 (안정성 기반)
4. 성능 최적화 (DB, 컴포넌트)
5. 접근성 (UX 개선)
6. 보안 (마지막 — 다른 수정 후 통합 점검)

## Pitfalls

| 위험 | 예방 |
|------|------|
| 리팩토링 중 회귀 | 각 수정 후 즉시 빌드+배포 검증 |
| canonical 수정 시 다른 SEO 요소 깨짐 | sitemap, robots.txt 함께 검증 |
| DB 인덱스 추가 시 기존 쿼리 성능 변화 | 인덱스 추가 전후 EXPLAIN 확인 |
| 커넥션 풀 변경 시 Neon 제한 초과 | Neon free tier 제한 확인 |
| 보안 헤더(CSP) 추가 시 외부 스크립트 차단 | Kakao SDK, GA, AdSense, Firebase 도메인 허용 |

---
*Research completed: 2026-03-26 (inline, researcher agents hit rate limit)*
