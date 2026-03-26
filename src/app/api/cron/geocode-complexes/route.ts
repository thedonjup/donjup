import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 300; // 5분

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restKey = process.env.KAKAO_REST_KEY;
  if (!restKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_KEY가 설정되지 않았습니다" },
      { status: 500 },
    );
  }

  const supabase = createServiceClient();

  // 좌표가 없는 단지 최대 100개 조회
  const { data: complexes, error: fetchError } = await supabase
    .from("apt_complexes")
    .select("id, address, apt_name, region_name, dong_name")
    .is("latitude", null)
    .limit(100);

  if (fetchError) {
    logger.error("Geocode-complexes DB fetch failed", { error: fetchError, cron: "geocode-complexes" });
    await sendSlackAlert(`[geocode-complexes] DB 조회 실패: ${fetchError.message}`);
    return NextResponse.json(
      { error: `DB 조회 실패: ${fetchError.message}` },
      { status: 500 },
    );
  }

  if (!complexes || complexes.length === 0) {
    return NextResponse.json({
      success: true,
      message: "지오코딩할 단지 없음",
      updated: 0,
    });
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const complex of complexes) {
    try {
      // Build search query from available address info
      const query =
        complex.address ||
        `${complex.region_name} ${complex.dong_name || ""} ${complex.apt_name}`.trim();

      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `KakaoAK ${restKey}` },
        },
      );

      if (!res.ok) {
        errors.push(`${complex.apt_name}: API ${res.status}`);
        continue;
      }

      const data = await res.json();

      if (!data.documents || data.documents.length === 0) {
        // Fallback: try keyword search
        const keywordRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `KakaoAK ${restKey}` },
          },
        );

        if (keywordRes.ok) {
          const keywordData = await keywordRes.json();
          if (keywordData.documents && keywordData.documents.length > 0) {
            const doc = keywordData.documents[0];
            const lat = parseFloat(doc.y);
            const lng = parseFloat(doc.x);

            await supabase
              .from("apt_complexes")
              .update({ latitude: lat, longitude: lng })
              .eq("id", complex.id);

            updated++;
            continue;
          }
        }

        skipped++;
        continue;
      }

      const doc = data.documents[0];
      const lat = parseFloat(doc.y);
      const lng = parseFloat(doc.x);

      await supabase
        .from("apt_complexes")
        .update({ latitude: lat, longitude: lng })
        .eq("id", complex.id);

      updated++;

      // Rate limiting: ~50ms between requests
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${complex.apt_name}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    logger.error("Geocode-complexes had errors", { errorCount: errors.length, cron: "geocode-complexes" });
    await sendSlackAlert(`[geocode-complexes] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  return NextResponse.json({
    success: true,
    total: complexes.length,
    updated,
    skipped,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
}
