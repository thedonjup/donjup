import { createClient } from "@supabase/supabase-js";

/**
 * 전월세/지수 전용 Supabase 클라이언트 (보조 DB)
 */
export function createRentServiceClient() {
  const url = process.env.RENT_SUPABASE_URL;
  const key = process.env.RENT_SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("RENT_SUPABASE_URL / RENT_SUPABASE_SERVICE_KEY 환경변수 필요");
  }

  return createClient(url, key);
}
