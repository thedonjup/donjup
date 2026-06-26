import Link from "next/link";
import { aptUrl } from "@/lib/apt-url";
import { formatPrice } from "@/lib/format";
import type { AptDetailNearbyComplex } from "@/lib/apt-detail-query";

function formatTradeCount(count: number): string {
  if (count <= 0) return "거래 없음";
  return `${count.toLocaleString()}건`;
}

function formatJeonseRatio(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

function formatGapAmount(value: number | null): string {
  return value === null ? "-" : formatPrice(value);
}

export default function NearbyComplexComparison({
  complexes,
}: {
  complexes: AptDetailNearbyComplex[];
}) {
  if (complexes.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold t-text">같은 동네 단지 비교</h2>
          <p className="mt-1 text-xs t-text-tertiary">
            최신 매매가와 같은 면적대 전세가가 모두 있는 단지만 전세가율과 갭을 표시합니다.
          </p>
        </div>
        <Link
          href="/compare"
          className="text-xs font-bold t-text-secondary transition hover:t-text"
        >
          비교함 열기
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border t-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-elevated)] text-xs t-text-tertiary">
            <tr>
              <th className="px-4 py-3 font-semibold">단지</th>
              <th className="px-4 py-3 font-semibold">최근 매매</th>
              <th className="px-4 py-3 font-semibold">전세가율</th>
              <th className="px-4 py-3 font-semibold">갭</th>
              <th className="px-4 py-3 font-semibold">거래량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {complexes.map((complex) => {
              const detailHref = aptUrl({
                govtComplexId: complex.govt_complex_id,
                identityId: complex.identity_id,
                regionCode: complex.region_code,
                slug: complex.slug,
              });

              return (
                <tr key={complex.slug} className="bg-[var(--color-surface-card)]">
                  <td className="px-4 py-3">
                    <Link href={detailHref} className="font-bold t-text transition hover:opacity-80">
                      {complex.apt_name}
                    </Link>
                    <p className="mt-0.5 text-xs t-text-tertiary">
                      {complex.dong_name ?? complex.region_name}
                      {complex.built_year ? ` · ${complex.built_year}년` : ""}
                      {complex.total_units ? ` · ${complex.total_units.toLocaleString()}세대` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums t-text">
                    {complex.latest_trade_price ? formatPrice(complex.latest_trade_price) : "-"}
                    {complex.latest_trade_date && (
                      <span className="mt-0.5 block text-xs font-normal t-text-tertiary">
                        {complex.latest_trade_date}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums t-text">
                    {formatJeonseRatio(complex.jeonse_ratio)}
                    {complex.latest_rent_date && (
                      <span className="mt-0.5 block text-xs font-normal t-text-tertiary">
                        전세 {complex.latest_rent_deposit ? formatPrice(complex.latest_rent_deposit) : "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums t-text">
                    {formatGapAmount(complex.gap_amount)}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold tabular-nums t-text-secondary">
                    {formatTradeCount(complex.trade_count)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
