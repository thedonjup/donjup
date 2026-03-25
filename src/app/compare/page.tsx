"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface Complex {
  id: string;
  apt_name: string;
  region_code: string;
  region_name: string;
  dong_name: string | null;
  built_year: number | null;
  slug: string;
  total_units?: number | null;
}

interface CompareData {
  complex: Complex;
  latestTrade: {
    trade_price: number;
    trade_date: string;
    size_sqm: number;
    floor: number;
  } | null;
  highestPrice: number | null;
  lowestRecent: number | null;
  tradeCount: number;
  latestRent: {
    deposit: number;
    monthly_rent: number;
    rent_type: string;
  } | null;
}

export default function ComparePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Complex[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CompareData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error("검색 실패");
      const json = await res.json();
      setSearchResults(json.results ?? []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  const addComplex = useCallback(async (complex: Complex) => {
    if (selected.length >= 3) return;
    if (selected.some((s) => s.complex.id === complex.id)) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch transaction data for this complex
      const res = await fetch(`/api/apt/${complex.id}`);
      if (!res.ok) throw new Error("데이터 로드 실패");
      const json = await res.json();

      const transactions = json.transactions ?? [];
      const rents: any[] = [];

      const latestTrade = transactions.length > 0
        ? {
            trade_price: transactions[0].trade_price,
            trade_date: transactions[0].trade_date,
            size_sqm: transactions[0].size_sqm,
            floor: transactions[0].floor,
          }
        : null;

      const prices = transactions.map((t: { trade_price: number }) => t.trade_price);
      const highestPrice = prices.length > 0 ? Math.max(...prices) : null;
      const recentPrices = transactions.slice(0, 10).map((t: { trade_price: number }) => t.trade_price);
      const lowestRecent = recentPrices.length > 0 ? Math.min(...recentPrices) : null;

      const latestRent = rents.length > 0
        ? {
            deposit: rents[0].deposit,
            monthly_rent: rents[0].monthly_rent,
            rent_type: rents[0].rent_type,
          }
        : null;

      setSelected((prev) => [
        ...prev,
        {
          complex: { ...complex, total_units: json.complex?.total_units ?? null },
          latestTrade,
          highestPrice,
          lowestRecent,
          tradeCount: transactions.length,
          latestRent,
        },
      ]);
    } catch (e: any) {
      setError(e.message ?? "데이터를 불러올 수 없습니다");
      setSelected((prev) => [
        ...prev,
        {
          complex,
          latestTrade: null,
          highestPrice: null,
          lowestRecent: null,
          tradeCount: 0,
          latestRent: null,
        },
      ]);
    }
    setLoading(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [selected]);

  const removeComplex = useCallback((id: string) => {
    setSelected((prev) => prev.filter((s) => s.complex.id !== id));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text sm:text-3xl">
            단지 비교
          </h1>
        </div>
        <p className="mt-2 text-sm t-text-secondary">
          최대 3개 단지를 선택하여 시세, 거래 이력, 전세가 등을 한눈에 비교하세요.
        </p>
      </section>

      {/* Search to Add */}
      {selected.length < 3 && (
        <section className="mb-8">
          <div className="rounded-2xl border t-border t-card p-5">
            <p className="mb-3 text-sm font-semibold t-text">
              단지 추가 ({selected.length}/3)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  doSearch(e.target.value);
                }}
                placeholder="아파트명 또는 지역+아파트명 검색 (예: 강남 래미안)"
                className="flex-1 rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-card)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            {/* Search Results Dropdown */}
            {(searching || searchResults.length > 0) && searchQuery.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border t-border" style={{ background: "var(--color-surface-card)" }}>
                {searching ? (
                  <div className="p-4 text-center text-sm t-text-tertiary">검색 중...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm t-text-tertiary">검색 결과가 없습니다</div>
                ) : (
                  searchResults.map((apt) => {
                    const alreadyAdded = selected.some((s) => s.complex.id === apt.id);
                    return (
                      <button
                        key={apt.id}
                        onClick={() => !alreadyAdded && addComplex(apt)}
                        disabled={alreadyAdded || loading}
                        className={`flex w-full items-center justify-between border-b last:border-b-0 t-border px-4 py-3 text-left text-sm transition ${
                          alreadyAdded
                            ? "opacity-40"
                            : "hover:bg-[var(--color-surface-elevated)]"
                        }`}
                      >
                        <div>
                          <p className="font-semibold t-text">{apt.apt_name}</p>
                          <p className="text-xs t-text-tertiary">
                            {apt.region_name} {apt.dong_name ?? ""}
                            {apt.built_year ? ` | ${apt.built_year}년` : ""}
                          </p>
                        </div>
                        {alreadyAdded ? (
                          <span className="text-xs t-text-tertiary">추가됨</span>
                        ) : (
                          <span className="text-xs font-semibold text-brand-600">+ 추가</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mb-4 text-center text-sm t-text-tertiary">데이터를 불러오는 중...</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</div>
      )}

      {/* Selected Complexes Tags */}
      {selected.length > 0 && (
        <section className="mb-6">
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span
                key={s.complex.id}
                className="inline-flex items-center gap-1.5 rounded-full brand-tint-bg px-3 py-1.5 text-sm font-medium text-brand-600"
              >
                {s.complex.apt_name}
                <button
                  onClick={() => removeComplex(s.complex.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-brand-100"
                  aria-label={`${s.complex.apt_name} 제거`}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Comparison Table */}
      {selected.length >= 2 ? (
        <section>
          <div className="overflow-x-auto rounded-2xl border t-border t-card">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="pb-3 pr-4 text-left text-xs font-medium t-text-tertiary w-32">
                    항목
                  </th>
                  {selected.map((s) => (
                    <th key={s.complex.id} className="pb-3 px-2 text-center text-xs font-bold t-text">
                      <Link
                        href={`/apt/${s.complex.region_code}/${s.complex.slug}`}
                        className="hover:text-brand-600"
                      >
                        {s.complex.apt_name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="지역">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center t-text-secondary">
                      {s.complex.region_name}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="준공년도">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text">
                      {s.complex.built_year ? `${s.complex.built_year}년` : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="세대수">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text">
                      {s.complex.total_units ? `${s.complex.total_units.toLocaleString()}세대` : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최근 거래가">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center font-bold tabular-nums t-text">
                      {s.latestTrade ? formatPrice(s.latestTrade.trade_price) : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최근 거래일">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text-secondary text-xs">
                      {s.latestTrade?.trade_date ?? "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최고가">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center font-bold tabular-nums t-rise">
                      {s.highestPrice ? formatPrice(s.highestPrice) : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="최근 최저가">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center font-bold tabular-nums t-drop">
                      {s.lowestRecent ? formatPrice(s.lowestRecent) : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="전세/보증금">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text">
                      {s.latestRent
                        ? `${formatPrice(s.latestRent.deposit)}${s.latestRent.monthly_rent > 0 ? ` / ${s.latestRent.monthly_rent}만` : ""}`
                        : "-"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="전세가율">
                  {selected.map((s) => {
                    let ratio = "-";
                    if (s.latestRent && s.latestTrade && s.latestRent.rent_type === "전세" && s.latestTrade.trade_price > 0) {
                      ratio = `${((s.latestRent.deposit / s.latestTrade.trade_price) * 100).toFixed(1)}%`;
                    }
                    return (
                      <td key={s.complex.id} className="py-3 px-2 text-center font-semibold tabular-nums t-text">
                        {ratio}
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="거래 건수">
                  {selected.map((s) => (
                    <td key={s.complex.id} className="py-3 px-2 text-center tabular-nums t-text-secondary">
                      {s.tradeCount.toLocaleString()}건
                    </td>
                  ))}
                </CompareRow>
              </tbody>
            </table>
          </div>
        </section>
      ) : selected.length === 1 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">비교할 단지를 1개 더 추가하세요</p>
          <p className="mt-1 text-sm t-text-tertiary">
            최소 2개 단지를 선택해야 비교표가 표시됩니다
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">비교할 단지를 검색하여 추가하세요</p>
          <p className="mt-1 text-sm t-text-tertiary">
            최대 3개 단지를 선택하여 시세와 정보를 비교할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}

function CompareRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b t-border transition hover:bg-[var(--color-surface-elevated)]">
      <td className="py-3 pr-4 text-xs font-medium t-text-tertiary">{label}</td>
      {children}
    </tr>
  );
}
