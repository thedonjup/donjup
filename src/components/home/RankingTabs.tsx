"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { formatPrice, formatSizeWithPyeong, formatRegion } from "@/lib/format";
import { aptUrl } from "@/lib/apt-url";
import { PROPERTY_TYPES } from "@/lib/constants/property-types";
import { shareViaKakao } from "@/lib/kakao-share";
import { trackCtaClick } from "@/lib/analytics/events";

export interface Transaction {
  id: string;
  region_code: string;
  region_name?: string;
  apt_name: string;
  size_sqm: number;
  floor: number;
  trade_price: number;
  trade_date: string;
  highest_price: number | null;
  change_rate: number | null;
  is_new_high: boolean;
  is_significant_drop: boolean;
  deal_type: string | null;
  drop_level?: string | null;
  property_type: number;
  complex_slug: string | null;
  govt_complex_id: string | null;
}

interface RankingTabsProps {
  drops: Transaction[];
  highs: Transaction[];
  volume: Transaction[];
  recent: Transaction[];
  showTypeBadge?: boolean;
}

type TabType = "drops" | "highs" | "volume" | "recent";

export default function RankingTabs({
  drops,
  highs,
  volume,
  recent,
  showTypeBadge = false,
}: RankingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("drops");
  const scrollRef = useRef<HTMLDivElement>(null);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "drops", label: "오늘의 폭락", icon: "📉" },
    { id: "highs", label: "오늘의 신고가", icon: "✨" },
    { id: "recent", label: "최신 거래", icon: "🕒" },
    { id: "volume", label: "많이 본 단지", icon: "🔥" },
  ];

  const currentData = activeTab === "drops" ? drops : activeTab === "highs" ? highs : activeTab === "volume" ? volume : recent;

  return (
    <div className="flex flex-col">
      {/* Tab Header */}
      <div className="flex space-x-1 rounded-xl bg-slate-100 p-1 mb-6 dark:bg-slate-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              trackCtaClick("home_ranking_tab_change", { tab: tab.id });
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.replace("오늘의 ", "")}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-3" ref={scrollRef}>
        {currentData.length > 0 ? (
          currentData.map((t, i) => {
            const isDrop = activeTab === "drops" || (t.change_rate !== null && t.change_rate < 0);
            const isHigh = activeTab === "highs" || t.is_new_high;

            return (
              <div
                key={`${t.id}-${activeTab}-${i}`}
                className="group relative flex items-center gap-4 rounded-2xl border t-border bg-white p-4 transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rank-badge ${isDrop ? "rank-badge-drop" : isHigh ? "rank-badge-rise" : "rank-badge-normal"}`}>
                      {i + 1}
                    </span>
                    <Link
                      href={aptUrl({ govtComplexId: t.govt_complex_id, regionCode: t.region_code, slug: t.complex_slug ?? '' })}
                      onClick={() =>
                        trackCtaClick("home_ranking_to_detail", {
                          tab: activeTab,
                          rank: i + 1,
                          region_code: t.region_code,
                        })
                      }
                      className="text-sm font-bold t-text truncate group-hover:text-brand-600 transition"
                    >
                      {t.apt_name}
                    </Link>
                    {showTypeBadge && t.property_type !== PROPERTY_TYPES.APT && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                        {t.property_type === PROPERTY_TYPES.VILLA ? "빌라" : "오피"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs t-text-tertiary">
                    {formatRegion(t.region_code)} · {t.trade_date}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <p className="text-sm font-black tabular-nums t-text">
                    {formatPrice(t.trade_price)}
                  </p>
                  {t.change_rate !== null && (
                    <p className={`mt-0.5 text-[11px] font-bold tabular-nums ${t.change_rate < 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {t.change_rate > 0 ? "▲" : "▼"} {Math.abs(t.change_rate)}%
                    </p>
                  )}
                  {t.is_new_high && activeTab !== "highs" && (
                    <span className="mt-0.5 text-[10px] font-bold text-emerald-500">신고가</span>
                  )}
                </div>

                {/* Quick Share Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const desc = isDrop && t.highest_price != null && t.change_rate !== null
                      ? `최고가 ${formatPrice(t.highest_price)} → 현재 ${formatPrice(t.trade_price)} | 돈줍 확인`
                      : `${formatRegion(t.region_code)} · ${formatPrice(t.trade_price)} | 돈줍 확인`;
                    shareViaKakao({
                      title: t.apt_name,
                      description: desc,
                      url: aptUrl({ govtComplexId: t.govt_complex_id, regionCode: t.region_code, slug: t.complex_slug ?? '' }),
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-brand-50 rounded-lg text-brand-600"
                  aria-label="공유하기"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center rounded-2xl border-2 border-dashed t-border">
            <p className="text-sm t-text-tertiary">데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* Link to all */}
      <div className="mt-6">
        <Link
          href={activeTab === "drops" ? "/today" : activeTab === "highs" ? "/new-highs" : "/map"}
          onClick={() => trackCtaClick("home_ranking_more", { tab: activeTab })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border t-border py-3 text-sm font-semibold t-text-secondary transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          더 많은 데이터 보기
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
