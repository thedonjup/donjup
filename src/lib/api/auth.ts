import type { NextResponse } from "next/server";
import {
  serviceUnavailableResponse,
  unauthorizedResponse,
} from "@/lib/api/safe-error-response";

/**
 * Vercel Cron Job 또는 외부 스케줄러의 인증을 확인합니다.
 * Authorization: Bearer {CRON_SECRET} 헤더가 필요합니다.
 *
 * @param request Next.js Request 객체
 * @returns 인증 실패 시 401 Response, 성공 시 null
 */
export function verifyCronAuth(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): NextResponse | null {
  // 로컬 개발 환경에서 CRON_SECRET이 설정되지 않은 경우 통과 (선택 사항)
  // if (process.env.NODE_ENV === "development" && !process.env.CRON_SECRET) {
  //   return null;
  // }

  const cronSecret = env.CRON_SECRET;
  if (!cronSecret) {
    return serviceUnavailableResponse();
  }

  const authHeader = request.headers.get("Authorization");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return unauthorizedResponse();
  }

  return null;
}
