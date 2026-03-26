import Link from "next/link";
import type { Metadata } from "next";
import { createRentServiceClient } from "@/lib/db/rent-client";
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
  alternates: { canonical: "/rent" },
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
  return `${regionCode}-${aptName.replace(/[^가-힣a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
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
    const timer = setTimeout(() => ac.abort(), 30000);

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
          <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
            전국 아파트 전월세 실거래가
          </h1>
        </div>
        <p className="mt-2 text-sm t-text-secondary">
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
                : "t-elevated t-text-secondary hover:bg-[var(--color-surface-elevated)]"
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
                  : "t-elevated t-text-secondary hover:bg-[var(--color-surface-elevated)]"
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
          <h2 className="text-lg font-bold t-text">전세 TOP</h2>
          <span className="text-xs t-text-tertiary">보증금 높은순 (고가 전세)</span>
        </div>

        {jeonseItems.length === 0 ? (
          <p className="rounded-xl border t-border t-card px-4 py-8 text-center text-sm t-text-tertiary">
            해당 지역의 전세 거래 데이터가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">보증금</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">거래일</th>
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
                      className="transition hover:bg-[var(--color-surface-elevated)]"
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 tabular-nums t-text-tertiary">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/apt/${regionCode}/${slug}`}
                          className="font-semibold t-text hover:text-brand-600 transition"
                        >
                          {aptName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 t-text-secondary">
                        {String(item.region_name ?? "")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                        {sizeSqm}㎡({sqmToPyeong(sizeSqm)}평)
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums t-rise">
                        {formatPrice(deposit)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full t-rise-bg px-2 py-0.5 text-xs font-medium t-rise">
                          전세
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums t-text-tertiary">
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
          <h2 className="text-lg font-bold t-text">월세 TOP</h2>
          <span className="text-xs t-text-tertiary">최근 월세 거래</span>
        </div>

        {wolseItems.length === 0 ? (
          <p className="rounded-xl border t-border t-card px-4 py-8 text-center text-sm t-text-tertiary">
            해당 지역의 월세 거래 데이터가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">보증금</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">월세</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">거래일</th>
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
                      className="transition hover:bg-[var(--color-surface-elevated)]"
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 tabular-nums t-text-tertiary">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/apt/${regionCode}/${slug}`}
                          className="font-semibold t-text hover:text-brand-600 transition"
                        >
                          {aptName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 t-text-secondary">
                        {String(item.region_name ?? "")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                        {sizeSqm}㎡({sqmToPyeong(sizeSqm)}평)
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold t-text">
                        {formatPrice(deposit)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums gold-text">
                        {monthlyRent.toLocaleString()}만
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full gold-badge-bg px-2 py-0.5 text-xs font-medium gold-text">
                          월세
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums t-text-tertiary">
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
