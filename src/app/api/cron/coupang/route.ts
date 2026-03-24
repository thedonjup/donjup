import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/client";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  let updated = 0;
  const errors: string[] = [];

  try {
    // 쿠팡파트너스 API 설정 확인
    const accessKey = process.env.COUPANG_ACCESS_KEY;
    const secretKey = process.env.COUPANG_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return NextResponse.json({
        success: false,
        message: "쿠팡파트너스 API 키가 설정되지 않았습니다. COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY 환경변수를 확인하세요.",
      }, { status: 400 });
    }

    // 쿠팡 상품 테이블 확보
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupang_products (
        id SERIAL PRIMARY KEY,
        product_id TEXT NOT NULL UNIQUE,
        product_name TEXT NOT NULL,
        product_url TEXT NOT NULL,
        product_image TEXT,
        product_price BIGINT,
        category TEXT,
        keyword TEXT,
        is_rocket BOOLEAN DEFAULT false,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 부동산 관련 키워드로 상품 검색
    const keywords = ["이사용품", "집들이선물", "인테리어소품", "수납정리", "청소용품"];

    for (const keyword of keywords) {
      try {
        // 쿠팡파트너스 Deeplink API 호출
        // Note: 실제 쿠팡파트너스 API는 HMAC 서명 필요
        // 여기서는 기본 구조만 구현, 추후 HMAC 서명 추가 필요
        const searchUrl = `https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=${encodeURIComponent(keyword)}&limit=10`;

        const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const method = "GET";
        const path = `/v2/providers/affiliate_open_api/apis/openapi/products/search`;

        // HMAC signature generation
        const { createHmac } = await import("crypto");
        const message = `${timestamp}${method}${path}`;
        const signature = createHmac("sha256", secretKey).update(message).digest("hex");

        const res = await fetch(searchUrl, {
          headers: {
            "Authorization": `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${timestamp}, signature=${signature}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          errors.push(`${keyword}: API 응답 ${res.status}`);
          continue;
        }

        const data = await res.json();
        const products = data?.data?.productData || [];

        for (const p of products) {
          await pool.query(
            `INSERT INTO coupang_products (product_id, product_name, product_url, product_image, product_price, category, keyword, is_rocket, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
             ON CONFLICT (product_id) DO UPDATE SET
               product_name = EXCLUDED.product_name,
               product_url = EXCLUDED.product_url,
               product_image = EXCLUDED.product_image,
               product_price = EXCLUDED.product_price,
               is_rocket = EXCLUDED.is_rocket,
               updated_at = now()`,
            [
              String(p.productId),
              p.productName,
              p.productUrl,
              p.productImage,
              p.productPrice ? Math.round(p.productPrice) : null,
              p.categoryName || keyword,
              keyword,
              p.isRocket || false,
            ]
          );
          updated++;
        }
      } catch (e) {
        errors.push(`${keyword}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({
    success: errors.length === 0,
    message: `쿠팡 상품 ${updated}건 갱신 완료`,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
