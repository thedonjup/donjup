"use client";

import { useState, useMemo, useCallback } from "react";
import { formatPrice, sqmToPyeong } from "@/lib/format";
import type { AptTransaction, AptRentTransaction } from "@/components/apt/AptDetailClient";
import { DROP_LEVEL_CONFIG } from "@/lib/constants/drop-level";

type Transaction = AptTransaction;

type RentTransaction = AptRentTransaction;

function formatSize(sqm: number, unit: "sqm" | "pyeong"): string {
  if (unit === "pyeong") return `${Math.round(sqmToPyeong(sqm))}평`; // compact display
  return `${sqm}㎡`;
}

export default function TransactionTabs({
  saleTxns,
  rentTxns,
  externalSelectedSize,
  sizeUnit: externalSizeUnit,
}: {
  saleTxns: Transaction[];
  rentTxns: RentTransaction[];
  externalSelectedSize?: number | null;
  sizeUnit?: "sqm" | "pyeong";
}) {
  const [tab, setTab] = useState<"sale" | "rent">("sale");
  const [internalSelectedSize, setInternalSelectedSize] = useState<number | null>(null);
  const [internalSizeUnit, setInternalSizeUnit] = useState<"sqm" | "pyeong">("sqm");

  const selectedSize = externalSelectedSize !== undefined ? externalSelectedSize : internalSelectedSize;
  const setSelectedSize = externalSelectedSize !== undefined ? () => {} : setInternalSelectedSize;
  const sizeUnit = externalSizeUnit ?? internalSizeUnit;
  const setSizeUnit = externalSizeUnit ? () => {} : setInternalSizeUnit;

  // 면적 목록 추출 (매매 + 전월세 통합)
  const sizeOptions = useMemo(() => {
    const sizes = new Set<number>();
    saleTxns.forEach((t) => sizes.add(t.size_sqm));
    rentTxns.forEach((t) => sizes.add(t.size_sqm));
    return Array.from(sizes).sort((a, b) => a - b);
  }, [saleTxns, rentTxns]);

  // 필터링된 거래 목록
  const filteredSale = useMemo(
    () => (selectedSize ? saleTxns.filter((t) => t.size_sqm === selectedSize) : saleTxns),
    [saleTxns, selectedSize]
  );
  const filteredRent = useMemo(
    () => (selectedSize ? rentTxns.filter((t) => t.size_sqm === selectedSize) : rentTxns),
    [rentTxns, selectedSize]
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, current: "sale" | "rent") => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setTab(current === "sale" ? "rent" : "sale");
      }
    },
    []
  );

  return (
    <div>
      {/* 면적 필터 + ㎡/평 토글 (외부 제어 시 숨김) */}
      {sizeOptions.length > 1 && externalSelectedSize === undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
              면적 선택
            </span>
            <button
              onClick={() => setSizeUnit((u) => (u === "sqm" ? "pyeong" : "sqm"))}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition"
              style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }}
              aria-label={sizeUnit === "sqm" ? "평으로 전환" : "제곱미터로 전환"}
            >
              {sizeUnit === "sqm" ? "㎡ → 평" : "평 → ㎡"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedSize(null)}
              className="rounded-full px-3 py-1.5 text-xs font-bold transition"
              style={
                selectedSize === null
                  ? { background: "var(--color-brand-600)", color: "var(--color-text-inverted)" }
                  : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
              }
            >
              전체
            </button>
            {sizeOptions.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className="rounded-full px-3 py-1.5 text-xs font-bold transition"
                style={
                  selectedSize === size
                    ? { background: "var(--color-brand-600)", color: "var(--color-text-inverted)" }
                    : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
                }
              >
                {formatSize(size, sizeUnit)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab buttons */}
      <div className="mb-4 flex gap-2" role="tablist" aria-label="거래 이력">
        <button
          role="tab"
          id="tab-sale"
          aria-selected={tab === "sale"}
          aria-controls="tabpanel-sale"
          tabIndex={tab === "sale" ? 0 : -1}
          onClick={() => setTab("sale")}
          onKeyDown={(e) => handleTabKeyDown(e, "sale")}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors"
          style={
            tab === "sale"
              ? { background: "var(--color-brand-600)", color: "var(--color-text-inverted)" }
              : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
          }
        >
          매매 이력
          <span
            className="inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold min-w-[20px]"
            style={
              tab === "sale"
                ? { background: "rgba(255,255,255,0.25)", color: "var(--color-text-inverted)" }
                : { background: "var(--color-border)", color: "var(--color-text-tertiary)" }
            }
          >
            {filteredSale.length}
          </span>
        </button>
        <button
          role="tab"
          id="tab-rent"
          aria-selected={tab === "rent"}
          aria-controls="tabpanel-rent"
          tabIndex={tab === "rent" ? 0 : -1}
          onClick={() => setTab("rent")}
          onKeyDown={(e) => handleTabKeyDown(e, "rent")}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors"
          style={
            tab === "rent"
              ? { background: "var(--color-brand-600)", color: "var(--color-text-inverted)" }
              : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
          }
        >
          전월세 이력
          <span
            className="inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold min-w-[20px]"
            style={
              tab === "rent"
                ? { background: "rgba(255,255,255,0.25)", color: "var(--color-text-inverted)" }
                : { background: "var(--color-border)", color: "var(--color-text-tertiary)" }
            }
          >
            {filteredRent.length}
          </span>
        </button>
      </div>

      {/* Sale table */}
      <div role="tabpanel" id="tabpanel-sale" aria-labelledby="tab-sale" hidden={tab !== "sale"}>
        {filteredSale.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 sm:hidden">
              {filteredSale.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border t-border t-card px-4 py-3"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs t-text-tertiary" style={{ color: "var(--color-text-tertiary)" }}>{t.trade_date}</p>
                      <p className="mt-0.5 text-sm t-text">
                        {formatSize(t.size_sqm, sizeUnit)} · {t.floor}층
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums t-text">{formatPrice(t.trade_price)}</p>
                      {t.change_rate !== null ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                          style={
                            t.change_rate < 0
                              ? { background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }
                              : t.change_rate > 0
                                ? { background: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" }
                                : { color: "var(--color-text-tertiary)" }
                          }
                        >
                          {t.change_rate < 0 ? "▼" : t.change_rate > 0 ? "▲" : ""} {Math.abs(t.change_rate)}%
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>-</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {t.deal_type === "직거래" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" }}>직거래</span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{t.deal_type === "중개거래" ? "중개" : t.deal_type || "-"}</span>
                    )}
                    {t.is_new_high && (
                      <span className="text-xs font-bold" style={{ color: "var(--color-semantic-rise)" }}>신고가</span>
                    )}
                    {t.drop_level && DROP_LEVEL_CONFIG[t.drop_level] && (
                      <span
                        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: DROP_LEVEL_CONFIG[t.drop_level].bg, color: DROP_LEVEL_CONFIG[t.drop_level].color }}
                      >
                        {DROP_LEVEL_CONFIG[t.drop_level].label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div
              className="hidden sm:block overflow-x-auto rounded-2xl border t-card"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left text-xs"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" }}
                  >
                    <th className="px-4 py-3">거래일</th>
                    <th className="px-4 py-3">면적</th>
                    <th className="px-4 py-3">층</th>
                    <th className="px-4 py-3 text-right">거래가</th>
                    <th className="px-4 py-3">거래유형</th>
                    <th className="px-4 py-3 text-right">변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSale.map((t) => (
                    <tr key={t.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <td className="px-4 py-3 t-text">{t.trade_date}</td>
                      <td className="px-4 py-3 t-text">{formatSize(t.size_sqm, sizeUnit)}</td>
                      <td className="px-4 py-3 t-text">{t.floor}층</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">{formatPrice(t.trade_price)}</td>
                      <td className="px-4 py-3">
                        {t.deal_type === "직거래" ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" }}>직거래</span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{t.deal_type === "중개거래" ? "중개" : t.deal_type || "-"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.change_rate !== null ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                            style={
                              t.change_rate < 0
                                ? { background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }
                                : t.change_rate > 0
                                  ? { background: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" }
                                  : { color: "var(--color-text-tertiary)" }
                            }
                          >
                            {t.change_rate < 0 ? "▼" : t.change_rate > 0 ? "▲" : ""} {Math.abs(t.change_rate)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-tertiary)" }}>-</span>
                        )}
                        {t.is_new_high && (
                          <span className="ml-1 text-xs font-bold" style={{ color: "var(--color-semantic-rise)" }}>신고가</span>
                        )}
                        {t.drop_level && DROP_LEVEL_CONFIG[t.drop_level] && (
                          <span
                            className="ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: DROP_LEVEL_CONFIG[t.drop_level].bg, color: DROP_LEVEL_CONFIG[t.drop_level].color }}
                          >
                            {DROP_LEVEL_CONFIG[t.drop_level].label}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {selectedSize ? `${formatSize(selectedSize, sizeUnit)} 면적의 매매 이력이 없습니다.` : "거래 이력이 없습니다."}
          </p>
        )}
      </div>

      {/* Rent table */}
      <div role="tabpanel" id="tabpanel-rent" aria-labelledby="tab-rent" hidden={tab !== "rent"}>
        {filteredRent.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 sm:hidden">
              {filteredRent.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border t-border t-card px-4 py-3"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs t-text-tertiary" style={{ color: "var(--color-text-tertiary)" }}>{r.trade_date}</p>
                      <p className="mt-0.5 text-sm t-text">
                        {formatSize(r.size_sqm, sizeUnit)} · {r.floor != null ? `${r.floor}층` : "-"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums t-text">{formatPrice(r.deposit)}</p>
                      {r.monthly_rent > 0 && (
                        <p className="text-xs t-text-secondary" style={{ color: "var(--color-text-secondary)" }}>
                          월 {formatPrice(r.monthly_rent)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {r.rent_type === "월세" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" }}>월세</span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>전세</span>
                    )}
                    {r.contract_type === "갱신" ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }}>갱신</span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{r.contract_type || "신규"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div
              className="hidden sm:block overflow-x-auto rounded-2xl border t-card"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left text-xs"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" }}
                  >
                    <th className="px-4 py-3">거래일</th>
                    <th className="px-4 py-3">면적</th>
                    <th className="px-4 py-3">층</th>
                    <th className="px-4 py-3 text-right">보증금</th>
                    <th className="px-4 py-3 text-right">월세</th>
                    <th className="px-4 py-3">유형</th>
                    <th className="px-4 py-3">계약유형</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRent.map((r) => (
                    <tr key={r.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <td className="px-4 py-3 t-text">{r.trade_date}</td>
                      <td className="px-4 py-3 t-text">{formatSize(r.size_sqm, sizeUnit)}</td>
                      <td className="px-4 py-3 t-text">{r.floor != null ? `${r.floor}층` : "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">{formatPrice(r.deposit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums t-text">{r.monthly_rent > 0 ? formatPrice(r.monthly_rent) : "-"}</td>
                      <td className="px-4 py-3">
                        {r.rent_type === "월세" ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" }}>
                            월세 {formatPrice(r.monthly_rent)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>전세</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.contract_type === "갱신" ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }}>갱신</span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{r.contract_type || "신규"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {selectedSize ? `${formatSize(selectedSize, sizeUnit)} 면적의 전월세 이력이 없습니다.` : "전월세 이력이 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
