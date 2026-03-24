"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/components/PropertyTypeFilter";

export interface Transaction {
  id: string;
  region_code: string;
  region_name: string;
  apt_name: string;
  size_sqm: number;
  trade_price: number;
  highest_price: number | null;
  change_rate: number | null;
  trade_date: string;
  is_new_high?: boolean;
  drop_level?: "normal" | "decline" | "crash" | "severe";
  property_type?: number;
}

const DROP_LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  decline: { label: "하락", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  crash: { label: "폭락", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  severe: { label: "대폭락", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
};

type TabKey = "drops" | "highs" | "volume" | "recent";

interface TabDef {
  key: TabKey;
  label: string;
  color: string;
  activeColor: string;
  badgeClass: string;
}

const TABS: TabDef[] = [
  {
    key: "drops",
    label: "폭락 TOP",
    color: "text-drop",
    activeColor: "bg-drop text-white",
    badgeClass: "rank-badge-drop",
  },
  {
    key: "highs",
    label: "신고가 TOP",
    color: "text-rise",
    activeColor: "bg-rise text-white",
    badgeClass: "rank-badge-rise",
  },
  {
    key: "volume",
    label: "거래량 TOP",
    color: "text-gold-500",
    activeColor: "bg-gold-500 text-white",
    badgeClass: "rank-badge-gold",
  },
  {
    key: "recent",
    label: "최근 거래",
    color: "text-blue-500",
    activeColor: "bg-blue-500 text-white",
    badgeClass: "rank-badge-drop",
  },
];

function makeSlug(regionCode: string, aptName: string): string {
  return `${regionCode}-${aptName
    .replace(/[^가-힣a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}`;
}

export default function RankingTabs({
  drops,
  highs,
  volume,
  recent,
  showTypeBadge = false,
}: {
  drops: Transaction[];
  highs: Transaction[];
  volume: Transaction[];
  recent: Transaction[];
  showTypeBadge?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("drops");

  const dataMap: Record<TabKey, Transaction[]> = {
    drops,
    highs,
    volume,
    recent,
  };

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const items = dataMap[activeTab];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl bg-surface-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
              activeTab === tab.key
                ? tab.activeColor + " shadow-sm"
                : "t-text-secondary hover:t-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.map((t, i) => {
            const isDrop = activeTab === "drops";
            const isHigh = activeTab === "highs";
            const slug = makeSlug(t.region_code, t.apt_name);

            return (
              <Link
                key={t.id}
                href={`/apt/${t.region_code}/${slug}`}
                className="block"
              >
                <div className="card-hover flex items-center gap-3 rounded-xl border t-border px-4 py-3.5 t-card">
                  {/* Rank */}
                  <div className={`rank-badge ${currentTab.badgeClass}`}>
                    {i + 1}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold t-text">
                        {t.apt_name}
                      </p>
                      {showTypeBadge && t.property_type != null && PROPERTY_TYPE_LABELS[t.property_type] && (
                        <span className="flex-shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
                          {PROPERTY_TYPE_LABELS[t.property_type]}
                        </span>
                      )}
                      <span className="flex-shrink-0 rounded bg-surface-100 px-1.5 py-0.5 text-[11px] font-medium t-text-tertiary">
                        {formatSizeWithPyeong(t.size_sqm)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs t-text-tertiary">
                      {t.region_name} · {t.trade_date}
                    </p>
                  </div>

                  {/* Price & Change */}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-2">
                      {t.highest_price != null && isDrop && (
                        <span className="text-xs t-text-tertiary line-through">
                          {formatPrice(t.highest_price)}
                        </span>
                      )}
                      <span className="font-bold tabular-nums t-text">
                        {formatPrice(t.trade_price)}
                      </span>
                    </div>
                    {t.change_rate !== null && (isDrop || isHigh) && (
                      <div className="mt-0.5 flex items-center gap-1.5 justify-end">
                        <span
                          className={`inline-block text-xs font-bold tabular-nums ${
                            isDrop ? "t-drop" : "t-rise"
                          }`}
                        >
                          {isDrop ? "▼" : "▲"} {Math.abs(t.change_rate)}%
                        </span>
                        {isDrop && t.drop_level && DROP_LEVEL_CONFIG[t.drop_level] && (
                          <span
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: DROP_LEVEL_CONFIG[t.drop_level].bg,
                              color: DROP_LEVEL_CONFIG[t.drop_level].color,
                            }}
                          >
                            {DROP_LEVEL_CONFIG[t.drop_level].label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-surface-200 p-10 text-center t-border">
            <p className="text-sm t-text-secondary">데이터 수집 중입니다</p>
            <p className="mt-1 text-xs t-text-tertiary">
              매일 밤 자동으로 업데이트됩니다
            </p>
          </div>
        )}
      </div>

      {/* More Link */}
      <Link
        href="/market"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border t-border bg-[var(--color-surface-card)] py-3 text-sm font-semibold t-text-secondary transition hover:bg-surface-50 t-card"
      >
        전국 시/도별 시세 보기
        <span className="t-text-tertiary">&rarr;</span>
      </Link>
    </div>
  );
}
