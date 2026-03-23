import Link from "next/link";
import type { Metadata } from "next";
import { createRentServiceClient } from "@/lib/supabase/rent-client";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import { formatPrice } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "전국 아파트 전월세 실거래가",
  description:
    "전국 아파트 전월세 실거래가를 한눈에. 고가 전세 TOP 랭킹, 최근 월세 거래, 지역별 전세가율을 확인하세요.",
  keywords: [
    "아파트 전월세",
    "전세 시세",
    "월세 시세",
    "전월세 실거래가",
    "전세 랭킹",
    "전세가율",
    "아파트 월세",
    "전세 보증금",
    "서울 전세",
    "경기 전세",
  ],
};

/** 시도코드 → slug 매핑 (필터용) */
const SIDO_SLUG_MAP: Record<string, string> = {};
const SLUG_TO_CODES: Record<string, string[]> = {};
for (const [code, sido] of Object.entries(REGION_HIERARCHY)) {
  SIDO_SLUG_MAP[code] = sido.slug;
  const sigunguCodes = Object.keys(sido.sigungu);
  SLUG_TO_CODES[sido.slug] = sigunguCodes;
}

/** 면적(㎡)을 평으로 변환 */
function sqmToPyeong(sqm: number): string {
  return (sqm / 3.3058).toFixed(0);
}

/** 단지 상세 링크용 slug 생성 */
function makeAptSlug(regionCode: string, aptName: string): string {
  return `${regionCode}-${aptName.replace(/[^가-힣a-zA-Z0-9]/g, "-").replace(/-+/g, "-").toLowerCase()}`;
}

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { sido } = await searchParams;
  const sidoFilter = typeof sido === "string" ? sido : undefined;

  const rentDb = createRentServiceClient();

  // 지역 필터용 region_code 목록
  let regionFilter: string[] | undefined;
  if (sidoFilter && SLUG_TO_CODES[sidoFilter]) {
    regionFilter = SLUG_TO_CODES[sidoFilter];
  }

  // 전세 TOP: 보증금 높은순
  let jeonseQuery = rentDb
    .from("apt_rent_transactions")
    .select("apt_name,region_code,region_name,size_sqm,floor,deposit,monthly_rent,rent_type,contract_type,trade_date")
    .eq("rent_type", "전세")
    .order("deposit", { ascending: false })
    .limit(20);

  if (regionFilter) {
    jeonseQuery = jeonseQuery.in("region_code", regionFilter);
  }

  // 월세 TOP: 최근 월세 거래
  let wolseQuery = rentDb
    .from("apt_rent_transactions")
    .select("apt_name,region_code,region_name,size_sqm,floor,deposit,monthly_rent,rent_type,contract_type,trade_date")
    .eq("rent_type", "월세")
    .order("trade_date", { ascending: false })
    .limit(20);

  if (regionFilter) {
    wolseQuery = wolseQuery.in("region_code", regionFilter);
  }

  let jeonseItems: Record<string, unknown>[] = [];
  let wolseItems: Record<string, unknown>[] = [];

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);

    const [jeonseResult, wolseResult] = await Promise.all([
      jeonseQuery.abortSignal(ac.signal),
      wolseQuery.abortSignal(ac.signal),
    ]);

    clearTimeout(timer);

    jeonseItems = jeonseResult.data ?? [];
    wolseItems = wolseResult.data ?? [];
  } catch (error) {
    console.error("전월세 데이터 조회 실패:", error);
  }

  // 시도 목록 (필터 버튼용)
  const sidoList = Object.values(REGION_HIERARCHY).map((s) => ({
    slug: s.slug,
    shortName: s.shortName,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold text-dark-900 sm:text-3xl">
            전국 아파트 전월세 실거래가
          </h1>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          고가 전세 TOP과 최근 월세 거래를 한눈에 확인하세요.
        </p>
      </section>

      {/* 시도 필터 */}
      <section className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/rent"
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              !sidoFilter
                ? "bg-brand-600 text-white"
                : "bg-surface-100 text-gray-600 hover:bg-surface-200"
            }`}
          >
            전체
          </Link>
          {sidoList.map((s) => (
            <Link
              key={s.slug}
              href={`/rent?sido=${s.slug}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                sidoFilter === s.slug
                  ? "bg-brand-600 text-white"
                  : "bg-surface-100 text-gray-600 hover:bg-surface-200"
              }`}
            >
              {s.shortName}
            </Link>
          ))}
        </div>
      </section>

      {/* 전세 TOP */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="rank-badge rank-badge-rise text-[11px]">전세</span>
          <h2 className="text-lg font-bold text-dark-900">전세 TOP</h2>
          <span className="text-xs text-gray-400">보증금 높은순 (고가 전세)</span>
        </div>

        {jeonseItems.length === 0 ? (
          <p className="rounded-xl border border-surface-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
            해당 지역의 전세 거래 데이터가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-3 font-medium">#</th>
                  <th className="pb-2 pr-3 font-medium">단지명</th>
                  <th className="pb-2 pr-3 font-medium">지역</th>
                  <th className="pb-2 pr-3 font-medium text-right">면적(평)</th>
                  <th className="pb-2 pr-3 font-medium text-right">보증금</th>
                  <th className="pb-2 pr-3 font-medium">유형</th>
                  <th className="pb-2 font-medium">거래일</th>
                </tr>
              </thead>
              <tbody>
                {jeonseItems.map((item: Record<string, unknown>, i: number) => {
                  const regionCode = String(item.region_code ?? "");
                  const aptName = String(item.apt_name ?? "");
                  const slug = makeAptSlug(regionCode, aptName);
                  const sizeSqm = Number(item.size_sqm ?? 0);
                  const deposit = Number(item.deposit ?? 0);

                  return (
                    <tr
                      key={`jeonse-${i}`}
                      className="border-b border-surface-100 transition hover:bg-surface-50"
                    >
                      <td className="py-3 pr-3 tabular-nums text-gray-400">
                        {i + 1}
                      </td>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/apt/${regionCode}/${slug}`}
                          className="font-semibold text-dark-900 hover:text-brand-600"
                        >
                          {aptName}
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-gray-500">
                        {String(item.region_name ?? "")}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-gray-600">
                        {sizeSqm}㎡({sqmToPyeong(sizeSqm)}평)
                      </td>
                      <td className="py-3 pr-3 text-right font-bold tabular-nums text-rise">
                        {formatPrice(deposit)}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-rise-bg px-2 py-0.5 text-xs font-medium text-rise">
                          전세
                        </span>
                      </td>
                      <td className="py-3 text-xs tabular-nums text-gray-400">
                        {String(item.trade_date ?? "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdSlot slotId="rent-infeed" format="infeed" className="my-6" />

      {/* 월세 TOP */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="rank-badge rank-badge-gold text-[11px]">월세</span>
          <h2 className="text-lg font-bold text-dark-900">월세 TOP</h2>
          <span className="text-xs text-gray-400">최근 월세 거래</span>
        </div>

        {wolseItems.length === 0 ? (
          <p className="rounded-xl border border-surface-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
            해당 지역의 월세 거래 데이터가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-3 font-medium">#</th>
                  <th className="pb-2 pr-3 font-medium">단지명</th>
                  <th className="pb-2 pr-3 font-medium">지역</th>
                  <th className="pb-2 pr-3 font-medium text-right">면적(평)</th>
                  <th className="pb-2 pr-3 font-medium text-right">보증금</th>
                  <th className="pb-2 pr-3 font-medium text-right">월세</th>
                  <th className="pb-2 pr-3 font-medium">유형</th>
                  <th className="pb-2 font-medium">거래일</th>
                </tr>
              </thead>
              <tbody>
                {wolseItems.map((item: Record<string, unknown>, i: number) => {
                  const regionCode = String(item.region_code ?? "");
                  const aptName = String(item.apt_name ?? "");
                  const slug = makeAptSlug(regionCode, aptName);
                  const sizeSqm = Number(item.size_sqm ?? 0);
                  const deposit = Number(item.deposit ?? 0);
                  const monthlyRent = Number(item.monthly_rent ?? 0);

                  return (
                    <tr
                      key={`wolse-${i}`}
                      className="border-b border-surface-100 transition hover:bg-surface-50"
                    >
                      <td className="py-3 pr-3 tabular-nums text-gray-400">
                        {i + 1}
                      </td>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/apt/${regionCode}/${slug}`}
                          className="font-semibold text-dark-900 hover:text-brand-600"
                        >
                          {aptName}
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-gray-500">
                        {String(item.region_name ?? "")}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-gray-600">
                        {sizeSqm}㎡({sqmToPyeong(sizeSqm)}평)
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums font-semibold text-dark-900">
                        {formatPrice(deposit)}
                      </td>
                      <td className="py-3 pr-3 text-right font-bold tabular-nums text-gold-600">
                        {monthlyRent.toLocaleString()}만
                      </td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-gold-50 px-2 py-0.5 text-xs font-medium text-gold-600">
                          월세
                        </span>
                      </td>
                      <td className="py-3 text-xs tabular-nums text-gray-400">
                        {String(item.trade_date ?? "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
