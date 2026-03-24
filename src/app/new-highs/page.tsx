import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { formatPrice, sqmToPyeong } from "@/lib/format";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "오늘의 신고가",
  description:
    "전국 아파트 신고가 거래 목록. 역대 최고가를 경신한 실거래 내역을 확인하세요.",
  keywords: ["아파트 신고가", "부동산 신고가", "실거래가 최고가", "아파트 시세"],
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

function makeSlug(regionCode: string, aptName: string): string {
  return `${regionCode}-${aptName
    .replace(/[^가-힣a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}`;
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
    const supabase = await createClient();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);

    const fields = "id,region_code,region_name,apt_name,size_sqm,trade_price,trade_date,deal_type,property_type";

    let query = supabase
      .from("apt_transactions")
      .select(fields)
      .eq("is_new_high", true)
      .order("trade_date", { ascending: false })
      .limit(50);

    if (validType !== 0) {
      query = query.eq("property_type", validType);
    }

    const { data } = await query.abortSignal(ac.signal);
    clearTimeout(timer);
    transactions = (data as NewHighTransaction[]) ?? [];
  } catch (e) {
    console.error("[NewHighs] DB query failed:", e instanceof Error ? e.message : e);
  }

  return (
    <div>
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
          <div className="overflow-x-auto rounded-2xl border t-border t-card">
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
                        {sqmToPyeong(tx.size_sqm)}평
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
        ) : (
          <div className="rounded-2xl border-2 border-dashed t-border p-10 text-center">
            <p className="text-sm t-text-secondary">신고가 데이터가 없습니다</p>
            <p className="mt-1 text-xs t-text-tertiary">
              매일 자동으로 업데이트됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
