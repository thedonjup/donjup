"use client";

import { useState } from "react";
import MiniAreaChartWrapper from "@/components/charts/MiniAreaChartWrapper";

export interface IndicatorItem {
  type: string;
  label: string;
  description: string;
  rateValue: number | null;
  prevValue: number | null;
  changeBp: number | null;
  baseDate: string;
  history: Array<{ value: number }>;
}

interface Props {
  indicators: IndicatorItem[];
}

export default function RateIndicatorAccordion({ indicators }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(idx: number) {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  }

  return (
    <div className="divide-y t-border rounded-2xl border t-border t-card overflow-hidden">
      {indicators.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={item.type}>
            {/* Accordion header */}
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-medium t-text text-sm">{item.label}</span>
              <div className="flex items-center gap-2 shrink-0">
                {item.rateValue !== null && (
                  <span className="font-bold tabular-nums t-text text-sm">
                    {item.rateValue}%
                  </span>
                )}
                {item.changeBp !== null && item.changeBp !== 0 && (
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      item.changeBp > 0 ? "t-drop-bg t-drop" : "t-rise-bg t-rise"
                    }`}
                  >
                    {item.changeBp > 0 ? "+" : ""}
                    {item.changeBp}bp
                  </span>
                )}
                <svg
                  className={`w-4 h-4 t-text-tertiary transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Accordion panel */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-4 pb-4">
                <p className="text-xs t-text-tertiary mb-2">{item.description}</p>
                <p className="text-[11px] t-text-tertiary">기준일: {item.baseDate}</p>
                {item.history.length > 1 && (
                  <div className="mt-3">
                    <MiniAreaChartWrapper
                      data={item.history}
                      color={
                        item.changeBp !== null && item.changeBp > 0
                          ? "#ef4444"
                          : "#059669"
                      }
                      height={48}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
