"use client";

import { useState } from "react";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";

interface Transaction {
  id: string;
  size_sqm: number;
  floor: number;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  deal_type: string | null;
}

interface RentTransaction {
  id: string;
  size_sqm: number;
  floor: number | null;
  deposit: number;
  monthly_rent: number;
  rent_type: string;
  contract_type: string | null;
  trade_date: string;
}

export default function TransactionTabs({
  saleTxns,
  rentTxns,
}: {
  saleTxns: Transaction[];
  rentTxns: RentTransaction[];
}) {
  const [tab, setTab] = useState<"sale" | "rent">("sale");

  return (
    <div>
      {/* Tab buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("sale")}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors"
          style={
            tab === "sale"
              ? { background: "var(--color-brand-600)", color: "#fff" }
              : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
          }
        >
          매매 이력
          <span
            className="inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold min-w-[20px]"
            style={
              tab === "sale"
                ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                : { background: "var(--color-border)", color: "var(--color-text-tertiary)" }
            }
          >
            {saleTxns.length}
          </span>
        </button>
        <button
          onClick={() => setTab("rent")}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors"
          style={
            tab === "rent"
              ? { background: "var(--color-brand-600)", color: "#fff" }
              : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
          }
        >
          전월세 이력
          <span
            className="inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold min-w-[20px]"
            style={
              tab === "rent"
                ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                : { background: "var(--color-border)", color: "var(--color-text-tertiary)" }
            }
          >
            {rentTxns.length}
          </span>
        </button>
      </div>

      {/* Sale table */}
      {tab === "sale" && (
        <>
          {saleTxns.length > 0 ? (
            <div
              className="overflow-x-auto rounded-2xl border t-card"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left text-xs"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-elevated)",
                      color: "var(--color-text-tertiary)",
                    }}
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
                  {saleTxns.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b last:border-0"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 t-text">{t.trade_date}</td>
                      <td className="px-4 py-3 t-text">{formatSizeWithPyeong(t.size_sqm)}</td>
                      <td className="px-4 py-3 t-text">{t.floor}층</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">
                        {formatPrice(t.trade_price)}
                      </td>
                      <td className="px-4 py-3">
                        {t.deal_type === "직거래" ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{
                              background: "var(--color-semantic-rise-bg)",
                              color: "var(--color-semantic-rise)",
                            }}
                          >
                            직거래
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                            {t.deal_type === "중개거래" ? "중개" : t.deal_type || "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.change_rate !== null ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                            style={
                              t.change_rate < 0
                                ? {
                                    background: "var(--color-semantic-drop-bg)",
                                    color: "var(--color-semantic-drop)",
                                  }
                                : t.change_rate > 0
                                  ? {
                                      background: "var(--color-semantic-rise-bg)",
                                      color: "var(--color-semantic-rise)",
                                    }
                                  : { color: "var(--color-text-tertiary)" }
                            }
                          >
                            {t.change_rate < 0 ? "▼" : t.change_rate > 0 ? "▲" : ""} {Math.abs(t.change_rate)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-tertiary)" }}>-</span>
                        )}
                        {t.is_new_high && (
                          <span
                            className="ml-1 text-xs font-bold"
                            style={{ color: "var(--color-semantic-rise)" }}
                          >
                            신고가
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              거래 이력이 없습니다.
            </p>
          )}
        </>
      )}

      {/* Rent table */}
      {tab === "rent" && (
        <>
          {rentTxns.length > 0 ? (
            <div
              className="overflow-x-auto rounded-2xl border t-card"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left text-xs"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-elevated)",
                      color: "var(--color-text-tertiary)",
                    }}
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
                  {rentTxns.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b last:border-0"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                    >
                      <td className="px-4 py-3 t-text">{r.trade_date}</td>
                      <td className="px-4 py-3 t-text">{formatSizeWithPyeong(r.size_sqm)}</td>
                      <td className="px-4 py-3 t-text">{r.floor != null ? `${r.floor}층` : "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums t-text">
                        {formatPrice(r.deposit)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums t-text">
                        {r.monthly_rent > 0 ? formatPrice(r.monthly_rent) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {r.rent_type === "월세" ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{
                              background: "var(--color-semantic-rise-bg)",
                              color: "var(--color-semantic-rise)",
                            }}
                          >
                            월세 {formatPrice(r.monthly_rent)}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                            전세
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.contract_type === "갱신" ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{
                              background: "var(--color-semantic-drop-bg)",
                              color: "var(--color-semantic-drop)",
                            }}
                          >
                            갱신
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                            {r.contract_type || "신규"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              전월세 이력이 없습니다.
            </p>
          )}
        </>
      )}
    </div>
  );
}
