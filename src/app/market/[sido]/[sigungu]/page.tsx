import { createClient } from "@/lib/db/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REGION_HIERARCHY, getSidoBySlug, getSidoForCode } from "@/lib/constants/region-codes";
import AdSlot from "@/components/ads/AdSlot";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";

export const revalidate = 3600;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
}

export async function generateStaticParams() {
  const params: { sido: string; sigungu: string }[] = [];
  for (const sido of Object.values(REGION_HIERARCHY)) {
    for (const code of Object.keys(sido.sigungu)) {
      params.push({ sido: sido.slug, sigungu: code });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sido: string; sigungu: string }>;
}): Promise<Metadata> {
  const { sido: sidoSlug, sigungu } = await params;
  const sido = getSidoBySlug(sidoSlug);
  if (!sido) return { title: "지역 정보" };

  const sigunguName = sido.sigungu[sigungu];
  if (!sigunguName) return { title: "지역 정보" };

  return {
    title: `${sido.shortName} ${sigunguName} 아파트 폭락 순위 - ${getCurrentMonth()}`,
    description: `${sido.name} ${sigunguName} 아파트 실거래가 폭락 순위, 신고가 갱신, 최근 거래 내역. 매일 자동 업데이트.`,
    alternates: { canonical: `/market/${sidoSlug}/${sigungu}` },
    keywords: [
      `${sigunguName} 아파트 시세`,
      `${sido.shortName} ${sigunguName} 부동산`,
      `${sigunguName} 아파트 실거래가`,
      `${sigunguName} 아파트 폭락`,
      `${sigunguName} 신고가`,
      `${sigunguName} 부동산 시세`,
      "아파트 폭락 순위",
      "실거래가",
    ],
  };
}

interface Transaction {
  id: string;
  apt_name: string;
  size_sqm: number;
  floor: number;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  region_code: string;
  region_name: string;
}

export default async function MarketSigunguPage({
  params,
  searchParams,
}: {
  params: Promise<{ sido: string; sigungu: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { sido: sidoSlug, sigungu } = await params;
  const { type: typeParam } = await searchParams;
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;
  const sido = getSidoBySlug(sidoSlug);
  if (!sido) notFound();

  const sigunguName = sido.sigungu[sigungu];
  if (!sigunguName) notFound();

  const supabase = await createClient();

  let drops: Transaction[] = [];
  let highs: Transaction[] = [];
  let recent: Transaction[] = [];
  let totalCount = 0;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);

    const applyTypeFilter = <Q extends { eq: (col: string, val: number) => Q }>(q: Q): Q =>
      validType !== 0 ? q.eq("property_type", validType) : q;
    const txFields = "id,region_code,region_name,apt_name,size_sqm,floor,trade_price,trade_date,highest_price,change_rate,is_new_high,is_significant_drop,deal_type,drop_level";

    const [dropsResult, highsResult, recentResult, countResult] = await Promise.all([
      applyTypeFilter(supabase.from("apt_transactions").select(txFields).eq("region_code", sigungu)
        .not("change_rate", "is", null).lt("change_rate", 0))
        .order("change_rate", { ascending: true }).limit(10).abortSignal(ac.signal),
      applyTypeFilter(supabase.from("apt_transactions").select(txFields).eq("region_code", sigungu)
        .eq("is_new_high", true)).order("trade_date", { ascending: false }).limit(10).abortSignal(ac.signal),
      applyTypeFilter(supabase.from("apt_transactions").select(txFields).eq("region_code", sigungu))
        .order("trade_date", { ascending: false }).limit(20).abortSignal(ac.signal),
      applyTypeFilter(supabase.from("apt_transactions").select("id", { count: "exact", head: true })
        .eq("region_code", sigungu)).abortSignal(ac.signal),
    ]);

    clearTimeout(timer);

    drops = (dropsResult.data ?? []) as Transaction[];
    highs = (highsResult.data ?? []) as Transaction[];
    recent = (recentResult.data ?? []) as Transaction[];
    totalCount = countResult.count ?? 0;
  } catch {
    // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
  }

  // Sibling sigungu for quick nav
  const siblingEntries = Object.entries(sido.sigungu);

  return (
    <div>
      <PropertyTypeFilter currentType={validType} />
      <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-2 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        <Link href="/" className="hover:opacity-80">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/market" className="hover:opacity-80">지역별 시세</Link>
        <span className="mx-2">/</span>
        <Link href={`/market/${sidoSlug}`} className="hover:opacity-80">{sido.shortName}</Link>
        <span className="mx-2">/</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{sigunguName}</span>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
            {sigunguName} 아파트 현황
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          총 {totalCount.toLocaleString()}건 · {getCurrentMonth()} 기준
        </p>
      </div>

      {/* Sigungu Quick Nav */}
      <div className="mb-8 flex flex-wrap gap-1.5">
        {siblingEntries.map(([code, name]) => (
          <Link
            key={code}
            href={`/market/${sidoSlug}/${code}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              code === sigungu
                ? "bg-brand-600 text-white"
                : "hover:opacity-80"
            }`}
            style={
              code !== sigungu
                ? { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
                : undefined
            }
          >
            {name}
          </Link>
        ))}
      </div>

      <AdSlot slotId="market-region-top" format="banner" />

      {/* 폭락 TOP */}
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block h-5 w-1.5 rounded-full bg-drop" />
          <h2 className="text-lg font-bold t-text">{sigunguName} 하락 거래 TOP 10</h2>
        </div>
        {drops.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" }}>
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">아파트</th>
                  <th className="px-4 py-3 text-right">면적</th>
                  <th className="px-4 py-3 text-right">최고가</th>
                  <th className="px-4 py-3 text-right">거래가</th>
                  <th className="px-4 py-3 text-right">변동률</th>
                </tr>
              </thead>
              <tbody>
                {drops.map((t, i) => (
                  <tr key={t.id} className="border-b last:border-0 transition hover:opacity-80" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <td className="px-4 py-3">
                      <span className="rank-badge rank-badge-drop text-[11px]">{i + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold t-text">{t.apt_name}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{t.trade_date}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{formatSizeWithPyeong(t.size_sqm)}</td>
                    <td className="px-4 py-3 text-right tabular-nums line-through" style={{ color: "var(--color-text-tertiary)" }}>
                      {t.highest_price ? formatPrice(t.highest_price) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">
                      {formatPrice(t.trade_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }}>
                        ▼ {t.change_rate !== null ? Math.abs(t.change_rate) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="해당 지역의 하락 거래 데이터가 없습니다." />
        )}
      </section>

      {/* 신고가 TOP */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block h-5 w-1.5 rounded-full bg-rise" />
          <h2 className="text-lg font-bold t-text">{sigunguName} 신고가 갱신 TOP 10</h2>
        </div>
        {highs.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" }}>
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">아파트</th>
                  <th className="px-4 py-3 text-right">면적</th>
                  <th className="px-4 py-3 text-right">거래가</th>
                  <th className="px-4 py-3 text-right">거래일</th>
                </tr>
              </thead>
              <tbody>
                {highs.map((t, i) => (
                  <tr key={t.id} className="border-b last:border-0 transition hover:opacity-80" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <td className="px-4 py-3">
                      <span className="rank-badge rank-badge-rise text-[11px]">{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold t-text">{t.apt_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{formatSizeWithPyeong(t.size_sqm)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">{formatPrice(t.trade_price)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--color-text-tertiary)" }}>{t.trade_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="해당 지역의 신고가 거래 데이터가 없습니다." />
        )}
      </section>

      <AdSlot slotId="market-region-mid" format="banner" />

      {/* 최근 거래 */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-500" />
          <h2 className="text-lg font-bold t-text">{sigunguName} 최근 거래</h2>
        </div>
        {recent.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" }}>
                  <th className="px-4 py-3">아파트</th>
                  <th className="px-4 py-3 text-right">면적</th>
                  <th className="px-4 py-3 text-right">층</th>
                  <th className="px-4 py-3 text-right">거래가</th>
                  <th className="px-4 py-3 text-right">거래일</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 transition hover:opacity-80" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <td className="px-4 py-3 font-semibold t-text">{t.apt_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{formatSizeWithPyeong(t.size_sqm)}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{t.floor}층</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">{formatPrice(t.trade_price)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--color-text-tertiary)" }}>{t.trade_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="해당 지역의 최근 거래 데이터가 없습니다." />
        )}
      </section>

      {/* CTA */}
      <section className="mt-10">
        <Link
          href="/rate/calculator"
          className="card-hover block rounded-2xl border-2 border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 text-center"
        >
          <p className="text-lg font-bold text-brand-900">
            {sigunguName} 아파트, 대출 이자는 얼마일까?
          </p>
          <p className="mt-1 text-sm text-brand-600">
            금리 계산기로 월 상환액을 확인하세요
          </p>
        </Link>
      </section>
    </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed p-8 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
      <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
        데이터가 수집되면 자동으로 업데이트됩니다.
      </p>
    </div>
  );
}
