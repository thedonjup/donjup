"use client";

import { useState } from "react";

export interface BankRateItem {
  rate_type: string;
  label: string;
  rate_value: number;
  prev_value: number | null;
  change_bp: number | null;
  base_date: string;
}

interface Props {
  banks: BankRateItem[];
  sourceDate: string;
}

export default function BankRateExpandable({ banks, sourceDate }: Props) {
  const [expandedBank, setExpandedBank] = useState<string | null>(null);

  function toggle(rateType: string) {
    setExpandedBank((prev) => (prev === rateType ? null : rateType));
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold t-text">은행별 주담대 금리</h2>
      <p className="mb-3 text-xs t-text-tertiary">
        금융감독원 금융상품한눈에 기준 | {sourceDate}
      </p>

      {/* Mobile: Card layout */}
      <div className="space-y-2 sm:hidden">
        {banks.map((bank) => {
          const isExpanded = expandedBank === bank.rate_type;
          return (
            <div
              key={bank.rate_type}
              className="rounded-xl border t-border t-card px-4 py-3 cursor-pointer"
              onClick={() => toggle(bank.rate_type)}
              role="button"
              aria-expanded={isExpanded}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(bank.rate_type);
                }
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium t-text text-sm">{bank.label}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-sm font-bold tabular-nums t-text">{bank.rate_value}%</p>
                  {bank.change_bp !== null && bank.change_bp !== 0 && (
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        bank.change_bp > 0 ? "t-drop-bg t-drop" : "t-rise-bg t-rise"
                      }`}
                    >
                      {bank.change_bp > 0 ? "+" : ""}
                      {bank.change_bp}bp
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded area */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  isExpanded ? "max-h-32 mt-2" : "max-h-0"
                }`}
              >
                <div className="border-t t-border pt-2 text-xs t-text-tertiary space-y-1">
                  <div className="flex justify-between">
                    <span>이전 금리</span>
                    <span>
                      {bank.prev_value !== null ? `${bank.prev_value}%` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>변동일</span>
                    <span>{bank.base_date}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden sm:block rounded-2xl border t-border t-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b t-elevated text-left text-xs t-text-secondary">
              <th className="px-4 py-3">은행명</th>
              <th className="px-4 py-3 text-right">최저금리</th>
              <th className="px-4 py-3 text-right">변동</th>
              <th className="px-4 py-3 text-right">기준일</th>
            </tr>
          </thead>
          <tbody>
            {banks.map((bank) => {
              const isExpanded = expandedBank === bank.rate_type;
              return (
                <>
                  <tr
                    key={bank.rate_type}
                    className="border-b t-border last:border-0 cursor-pointer hover:t-elevated"
                    onClick={() => toggle(bank.rate_type)}
                  >
                    <td className="px-4 py-3 font-medium t-text">{bank.label}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums t-text">
                      {bank.rate_value}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      {bank.change_bp !== null && bank.change_bp !== 0 ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                            bank.change_bp > 0
                              ? "t-drop-bg t-drop"
                              : "t-rise-bg t-rise"
                          }`}
                        >
                          {bank.change_bp > 0 ? "+" : ""}
                          {bank.change_bp}bp
                        </span>
                      ) : (
                        <span className="t-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right t-text-tertiary">
                      {bank.base_date}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${bank.rate_type}-expanded`} className="border-b t-border">
                      <td colSpan={4} className="px-4 py-2 text-xs t-text-tertiary t-elevated">
                        <div className="flex gap-6">
                          <span>
                            이전 금리:{" "}
                            <strong className="tabular-nums">
                              {bank.prev_value !== null ? `${bank.prev_value}%` : "-"}
                            </strong>
                          </span>
                          <span>
                            변동일: <strong>{bank.base_date}</strong>
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
