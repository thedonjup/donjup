import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aptRentTransactions } from "@/lib/db/schema";
import { fetchRentTransactions } from "@/lib/api/molit-rent";
import { delay } from "@/lib/api/molit";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";

export const maxDuration = 300; // 5분 (Vercel Pro)

/** 시/도 코드별 배치 그룹 (0-4) */
const BATCH_GROUPS: Record<number, string[]> = {
  0: ["11", "26", "27"],           // 서울, 부산, 대구
  1: ["28", "29", "30", "31", "36"], // 인천, 광주, 대전, 울산, 세종
  2: ["41"],                        // 경기
  3: ["42", "43", "44", "45"],      // 강원, 충북, 충남, 전북
  4: ["46", "47", "48", "50"],      // 전남, 경북, 경남, 제주
};

/** 배치 번호에 해당하는 시/도 코드 목록 반환. 없으면 전체. */
function getSidoCodesForBatch(batch: number | null): string[] {
  if (batch !== null && BATCH_GROUPS[batch]) {
    return BATCH_GROUPS[batch];
  }
  return Object.keys(REGION_HIERARCHY);
}

/** 시/도 코드 목록 → [regionCode, regionName] 튜플 배열 */
function getRegionEntries(sidoCodes: string[]): [string, string][] {
  const entries: [string, string][] = [];
  for (const sidoCode of sidoCodes) {
    const sido = REGION_HIERARCHY[sidoCode];
    if (!sido) continue;
    for (const [code, sigunguName] of Object.entries(sido.sigungu)) {
      entries.push([code, `${sido.shortName} ${sigunguName}`]);
    }
  }
  return entries;
}

export async function GET(request: Request) {
  // Cron 인증
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // batch 쿼리 파라미터 파싱
  const { searchParams } = new URL(request.url);
  const batchParam = searchParams.get("batch");
  const batch = batchParam !== null ? parseInt(batchParam, 10) : null;
  const isCronBatch = batch !== null && !isNaN(batch);

  const now = new Date();

  // 3개월 데이터 수집
  const monthCount = 3;
  const dealYearMonths: string[] = [];
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    dealYearMonths.push(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  let totalInserted = 0;
  const errors: string[] = [];

  // 배치별 지역 목록 구성
  const sidoCodes = getSidoCodesForBatch(isCronBatch ? batch : null);
  const regionEntries = getRegionEntries(sidoCodes);

  for (const dealYearMonth of dealYearMonths) {
    for (const [code, name] of regionEntries) {
      try {
        const transactions = await fetchRentTransactions(code, dealYearMonth);

        if (transactions.length === 0) {
          await delay(300);
          continue;
        }

        // DB 삽입 (중복 무시)
        const inserted = await db
          .insert(aptRentTransactions)
          .values(
            transactions.map((t) => ({
              regionCode: t.regionCode,
              regionName: `${name} ${t.dongName}`,
              aptName: t.aptName,
              sizeSqm: t.sizeSqm !== undefined ? String(t.sizeSqm) : null,
              floor: t.floor,
              deposit: t.deposit,
              monthlyRent: t.monthlyRent,
              rentType: t.rentType,
              contractType: t.contractType || null,
              tradeDate: t.tradeDate,
              preDeposit: t.preDeposit,
              preMonthlyRent: t.preMonthlyRent,
              rawData: t.rawData,
            }))
          )
          .onConflictDoNothing()
          .returning({ id: aptRentTransactions.id });

        totalInserted += inserted.length;

        await delay(300); // API 부하 방지
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${name}(${dealYearMonth}): ${msg}`);
      }
    }
  }

  if (errors.length > 0) {
    logger.error("Fetch-rents had errors", { errorCount: errors.length, cron: "fetch-rents" });
    await sendSlackAlert(`[fetch-rents] ${errors.length}건 에러: ${errors.slice(0, 3).join(", ")}`);
  }

  return NextResponse.json({
    success: true,
    batch: isCronBatch ? batch : "all",
    sidoCodes,
    dealYearMonths,
    totalInserted,
    regionsProcessed: regionEntries.length,
    monthsProcessed: dealYearMonths.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
