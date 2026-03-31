import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { formatPrice, sqmToPyeong } from "@/lib/format";
import { makeSlug } from "@/lib/apt-url";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "오늘의 신고가",
  description:
    "전국 아파트 신고가 거래 목록. 역대 최고가를 경신한 실거래 내역을 확인하세요.",
  keywords: ["아파트 신고가", "부동산 신고가", "실거래가 최고가", "아파트 시세"],
  alternates: { canonical: "/new-highs" },
};

interface NewHighTransaction {
  id: string;
  region_code: string;
  region_name: string;
  apt_name: string;
  size_sqm: number;
  trade_price: number;
  trade_date: string;
  deal_type: string | null;
  property_type?: number;
}


export default async function NewHighsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;

  let transactions: NewHighTransaction[] = [];

  try {
    const typeFilter = validType !== 0 ? eq(aptTransactions.propertyType, validType) : undefined;

    const rows = await db.select({
      id: aptTransactions.id,
      region_code: aptTransactions.regionCode,
      region_name: aptTransactions.regionName,
      apt_name: aptTransactions.aptName,
      size_sqm: aptTransactions.sizeSqm,
      trade_price: aptTransactions.tradePrice,
      trade_date: aptTransactions.tradeDate,
      deal_type: aptTransactions.dealType,
      property_type: aptTransactions.propertyType,
    }).from(aptTransactions)
      .where(and(eq(aptTransactions.isNewHigh, true), typeFilter))
      .orderBy(desc(aptTransactions.tradeDate))
      .limit(50);

    transactions = rows.map((r) => ({
      ...r,
      size_sqm: Number(r.size_sqm),
      trade_price: Number(r.trade_price),
    }));
  } catch (e) {
    console.error("[NewHighs] DB query failed:", e instanceof Error ? e.message : e);
  }

  return (
    <div>
      <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, { name: "오늘의 신고가", href: "/new-highs" }]} />
      {transactions.length > 0 && (
        <ItemListJsonLd
          name="오늘의 아파트 신고가 랭킹"
          items={transactions.slice(0, 10).map((tx, i) => ({
            name: `${tx.apt_name} (${tx.region_name})`,
            url: `https://donjup.com/apt/${tx.region_code}/${makeSlug(tx.region_code, tx.apt_name)}`,
            position: i + 1,
          }))}
        />
      )}
      <PropertyTypeFilter currentType={validType} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
            <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
              오늘의 신고가
            </h1>
          </div>
          <p className="mt-2 text-sm t-text-secondary">
            역대 최고가를 경신한 실거래 내역입니다. 최신순으로 정렬됩니다.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs t-text-tertiary">
            <span>총 {transactions.length}건</span>
          </div>
        </section>

        {transactions.length > 0 ? (
          <>
            {/* Mobile: Card layout */}
            <div className="space-y-2 sm:hidden">
              {transactions.map((tx, i) => {
                const slug = makeSlug(tx.region_code, tx.apt_name);
                return (
                  <Link
                    key={tx.id}
                    href={`/apt/${tx.region_code}/${slug}`}
                    className="card-hover block rounded-xl border t-border t-card px-4 py-3.5"
                    style={{ WebkitTapHighlightColor: "transparent", minHeight: 64 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="rank-badge rank-badge-rise text-[11px] shrink-0">{i + 1}</span>
                        <p className="truncate text-sm font-semibold t-text" style={{ lineHeight: "1.4" }}>
                          {tx.apt_name}
                        </p>
                      </div>
                      <p className="text-sm font-bold tabular-nums t-rise shrink-0">
                        {formatPrice(tx.trade_price)}
                      </p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 pl-7">
                      <span className="text-xs t-text-tertiary">
                        {tx.region_name} · {Math.round(sqmToPyeong(tx.size_sqm))}평 · {tx.trade_date}
                      </span>
                      {tx.deal_type === "직거래" && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" }}>
                          직거래
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">순위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래가</th>
                  <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium t-text-tertiary">거래유형</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => {
                  const slug = makeSlug(tx.region_code, tx.apt_name);
                  return (
                    <tr
                      key={tx.id}
                      className="transition hover:bg-[var(--color-surface-elevated)]"
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3">
                        <span className="rank-badge rank-badge-rise text-[11px]">{i + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/apt/${tx.region_code}/${slug}`}
                          className="font-semibold t-text hover:text-brand-600 transition"
                        >
                          {tx.apt_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm t-text-secondary">{tx.region_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                        {Math.round(sqmToPyeong(tx.size_sqm))}평
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums t-rise">
                        {formatPrice(tx.trade_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs t-text-tertiary">{tx.trade_date}</td>
                      <td className="px-4 py-3 text-center">
                        {tx.deal_type === "직거래" ? (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" }}>
                            직거래
                          </span>
                        ) : (
                          <span className="text-xs t-text-tertiary">
                            {tx.deal_type === "중개거래" ? "중개" : tx.deal_type || "-"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed t-border p-10 text-center">
            <p className="text-sm t-text-secondary">오늘의 신고가가 없습니다</p>
            <p className="mt-1 text-xs t-text-tertiary">
              아직 집계된 신고가 거래가 없어요. 내일 다시 확인해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
