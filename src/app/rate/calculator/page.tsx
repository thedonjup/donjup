"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TabId, TABS } from "./lib/calc-utils";
import { LoanCalculatorTab } from "./components/LoanCalculatorTab";
import { DsrCalculatorTab } from "./components/DsrCalculatorTab";
import { JeonseConversionTab } from "./components/JeonseConversionTab";

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8"><p className="t-text-tertiary">로딩 중...</p></div>}>
      <CalculatorContent />
    </Suspense>
  );
}

function CalculatorContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "loan";
  const [activeTab, setActiveTab] = useState<TabId>(
    ["loan", "dsr", "jeonse"].includes(initialTab) ? initialTab : "loan"
  );

  useEffect(() => {
    const tab = searchParams.get("tab") as TabId;
    if (tab && ["loan", "dsr", "jeonse"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
        <h1 className="text-2xl font-extrabold t-text">대출/부동산 계산기</h1>
      </div>
      <p className="text-sm t-text-secondary">
        대출 이자, DSR, 전세-월세 전환을 한곳에서 계산하세요.
      </p>

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-1 rounded-xl bg-surface-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[var(--color-surface-card)] text-brand-700 shadow-sm"
                : "t-text-secondary hover:t-text"
            }`}
          >
            <span className="block">{tab.label}</span>
            <span className="block text-[11px] font-normal opacity-70">{tab.description}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "loan" && <LoanCalculatorTab />}
      {activeTab === "dsr" && <DsrCalculatorTab />}
      {activeTab === "jeonse" && <JeonseConversionTab />}
    </div>
  );
}
