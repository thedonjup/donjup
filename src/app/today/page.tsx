import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { formatPrice, sqmToPyeong } from "@/lib/format";
import { makeSlug } from "@/lib/apt-url";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/JsonLd";
import { DROP_LEVEL_CONFIG } from "@/lib/constants/drop-level";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "오늘의 거래",
  description:
    "오늘 체결된 전국 아파트 실거래 내역. 최신 거래가와 변동률을 확인하세요.",
  keywords: ["오늘 아파트 거래", "실거래가", "아파트 매매", "부동산 거래"],
  alternates: { canonical: "/today" },
};

interface TodayTransaction {
  id: string;
  region_code: string;
  region_name: string;
  apt_name: string;
  size_sqm: number;
  floor: number | null;
  trade_price: number;
  trade_date: string;
  change_rate: number | null;
  deal_type: string | null;
  drop_level: string | null;
  property_type?: number;
}


export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type: typeParam } = await searchParams;
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;

  let transactions: TodayTransaction[] = [];

  try {
    const typeFilter = validType !== 0 ? eq(aptTransactions.propertyType, validType) : undefined;

    const rows = await db.select({
      id: aptTransactions.id,
      region_code: aptTransactions.regionCode,
      region_name: aptTransactions.regionName,
      apt_name: aptTransactions.aptName,
      size_sqm: aptTransactions.sizeSqm,
      floor: aptTransactions.floor,
      trade_price: aptTransactions.tradePrice,
      trade_date: aptTransactions.tradeDate,
      change_rate: aptTransactions.changeRate,
      deal_type: aptTransactions.dealType,
      drop_level: aptTransactions.dropLevel,
      property_type: aptTransactions.propertyType,
    }).from(aptTransactions)
      .where(typeFilter)
      .orderBy(desc(aptTransactions.tradeDate), desc(aptTransactions.tradePrice))
      .limit(100);

    transactions = rows.map((r) => ({
      ...r,
      size_sqm: Number(r.size_sqm),
      trade_price: Number(r.trade_price),
      change_rate: r.change_rate !== null ? Number(r.change_rate) : null,
    }));
  } catch (e) {
    console.error("[Today] DB query failed:", e instanceof Error ? e.message : e);
  }

  return (
    <div>
      <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, { name: "오늘의 거래", href: "/today" }]} />
      {transactions.length > 0 && (
        <ItemListJsonLd
          name="오늘의 아파트 거래 랭킹"
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
              오늘의 거래
            </h1>
          </div>
          <p className="mt-2 text-sm t-text-secondary">
            가장 최근 체결된 실거래 내역입니다. 거래일 및 거래가 순으로 정렬됩니다.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs t-text-tertiary">
            <span>총 {transactions.length}건</span>
          </div>
        </section>

        {transactions.length > 0 ? (
          <>
            {/* Mobile: Card layout */}
            <div className="space-y-2 sm:hidden">
              {transactions.map((tx) => {
                const slug = makeSlug(tx.region_code, tx.apt_name);
                const dropCfg = tx.drop_level ? DROP_LEVEL_CONFIG[tx.drop_level] : null;
                return (
                  <Link
                    key={tx.id}
                    href={`/apt/${tx.region_code}/${slug}`}
                    className="card-hover block rounded-xl border t-border t-card px-4 py-3.5"
                    style={{ WebkitTapHighlightColor: "transparent", minHeight: 64 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold t-text" style={{ lineHeight: "1.4" }}>
                          {tx.apt_name}
                        </p>
                        <p className="mt-0.5 text-xs t-text-tertiary" style={{ lineHeight: "1.4" }}>
                          {tx.region_name} · {Math.round(sqmToPyeong(tx.size_sqm))}평{tx.floor != null ? ` · ${tx.floor}층` : ""}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums t-text">
                          {formatPrice(tx.trade_price)}
                        </p>
                        <div className="mt-0.5 flex items-center justify-end gap-1">
                          {tx.change_rate != null ? (
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                tx.change_rate < 0 ? "t-drop" : tx.change_rate > 0 ? "t-rise" : "t-text-tertiary"
                              }`}
                            >
                              {tx.change_rate < 0 ? "▼" : tx.change_rate > 0 ? "▲" : ""}
                              {tx.change_rate !== 0 ? ` ${Math.abs(tx.change_rate)}%` : "0%"}
                            </span>
                          ) : (
                            <span className="text-xs t-text-tertiary">-</span>
                          )}
                          {dropCfg && (
                            <span
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: dropCfg.bg, color: dropCfg.color }}
                            >
                              {dropCfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px] t-text-tertiary">{tx.trade_date}</span>
                      {tx.deal_type === "직거래" ? (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" }}>
                          직거래
                        </span>
                      ) : tx.deal_type ? (
                        <span className="text-[11px] t-text-tertiary">
                          {tx.deal_type === "중개거래" ? "중개" : tx.deal_type}
                        </span>
                      ) : null}
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
                    <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">단지명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium t-text-tertiary">지역</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">면적(평)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">층</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">거래가</th>
                    <th className="px-4 py-3 text-right text-xs font-medium t-text-tertiary">변동률</th>
                    <th className="px-4 py-3 text-center text-xs font-medium t-text-tertiary">거래유형</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const slug = makeSlug(tx.region_code, tx.apt_name);
                    const dropCfg = tx.drop_level ? DROP_LEVEL_CONFIG[tx.drop_level] : null;
                    return (
                      <tr
                        key={tx.id}
                        className="transition hover:bg-[var(--color-surface-elevated)]"
                        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/apt/${tx.region_code}/${slug}`}
                            className="font-semibold t-text hover:text-brand-600 transition"
                          >
                            {tx.apt_name}
                          </Link>
                          <p className="mt-0.5 text-[11px] t-text-tertiary">{tx.trade_date}</p>
                        </td>
                        <td className="px-4 py-3 text-sm t-text-secondary">{tx.region_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                          {Math.round(sqmToPyeong(tx.size_sqm))}평
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums t-text-secondary">
                          {tx.floor != null ? `${tx.floor}층` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums t-text">
                          {formatPrice(tx.trade_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tx.change_rate != null ? (
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  tx.change_rate < 0 ? "t-drop" : tx.change_rate > 0 ? "t-rise" : "t-text-tertiary"
                                }`}
                              >
                                {tx.change_rate < 0 ? "▼" : tx.change_rate > 0 ? "▲" : ""}
                                {tx.change_rate !== 0 ? ` ${Math.abs(tx.change_rate)}%` : "0%"}
                              </span>
                            ) : (
                              <span className="text-xs t-text-tertiary">-</span>
                            )}
                            {dropCfg && (
                              <span
                                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                style={{ backgroundColor: dropCfg.bg, color: dropCfg.color }}
                              >
                                {dropCfg.label}
                              </span>
                            )}
                          </div>
                        </td>
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
            <p className="text-sm t-text-secondary">거래 데이터가 없습니다</p>
            <p className="mt-1 text-xs t-text-tertiary">
              매일 자동으로 업데이트됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
