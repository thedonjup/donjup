"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface KPIs {
  totalTransactions: number;
  totalComplexes: number;
  pushSubscribers: number;
  todayPageViews: number;
}

interface CronStatus {
  name: string;
  lastRun: string | null;
  status: "success" | "failed" | "unknown";
}

interface RecentTransaction {
  id: number;
  apt_name: string;
  deal_amount: number;
  deal_date: string;
  area: number;
  region: string;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [nullCount, setNullCount] = useState<number | null>(null);
  const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        const [txCount, complexCount, pushCount, recentData, nullData] = await Promise.all([
          supabase.from("transactions").select("*", { count: "exact", head: true }),
          supabase.from("complexes").select("*", { count: "exact", head: true }),
          supabase.from("push_subscriptions").select("*", { count: "exact", head: true }),
          supabase
            .from("transactions")
            .select("id, apt_name, deal_amount, deal_date, area, sido_name")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("complexes")
            .select("*", { count: "exact", head: true })
            .is("highest_price", null),
        ]);

        setKpis({
          totalTransactions: txCount.count ?? 0,
          totalComplexes: complexCount.count ?? 0,
          pushSubscribers: pushCount.count ?? 0,
          todayPageViews: 0, // GA4 API integration needed
        });

        setNullCount(nullData.count ?? 0);

        setRecentTx(
          (recentData.data ?? []).map((row: Record<string, unknown>) => ({
            id: row.id as number,
            apt_name: (row.apt_name as string) || "-",
            deal_amount: (row.deal_amount as number) || 0,
            deal_date: (row.deal_date as string) || "-",
            area: (row.area as number) || 0,
            region: (row.sido_name as string) || "-",
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터 로딩 실패");
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(() => {
      setError("요청 시간 초과");
      setLoading(false);
    }, 15000);

    fetchData().then(() => clearTimeout(timeout));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
        <p className="text-sm" style={{ color: "var(--color-semantic-drop)" }}>오류: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
        관리자 대시보드
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="총 거래건수" value={kpis?.totalTransactions ?? 0} format="number" />
        <KPICard label="등록 단지수" value={kpis?.totalComplexes ?? 0} format="number" />
        <KPICard label="푸시 구독자" value={kpis?.pushSubscribers ?? 0} format="number" />
        <KPICard label="오늘 페이지뷰" value={kpis?.todayPageViews ?? 0} format="number" note="GA4 연동 필요" />
      </div>

      {/* Data Quality */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            데이터 품질 요약
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--color-surface-elevated)" }}>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                highest_price NULL 단지
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  background: (nullCount ?? 0) > 0 ? "var(--color-semantic-warn-bg)" : "var(--color-semantic-rise-bg)",
                  color: (nullCount ?? 0) > 0 ? "var(--color-semantic-warn)" : "var(--color-semantic-rise)",
                }}
              >
                {nullCount?.toLocaleString() ?? 0}건
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-5" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            크론잡 상태 요약
          </h2>
          <div className="space-y-2">
            {CRON_SUMMARY.map((cron) => (
              <div key={cron.name} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--color-surface-elevated)" }}>
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{cron.name}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: "var(--color-surface-inset)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {cron.schedule}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
        <div className="border-b px-5 py-3" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            최근 거래 내역
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>아파트</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>지역</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>면적</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>거래금액</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>거래일</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>{tx.apt_name}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>{tx.region}</td>
                  <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-text-secondary)" }}>{tx.area}m²</td>
                  <td className="px-4 py-2.5 text-right font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {(tx.deal_amount / 10000).toFixed(tx.deal_amount % 10000 === 0 ? 0 : 1)}억
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: "var(--color-text-tertiary)" }}>{tx.deal_date}</td>
                </tr>
              ))}
              {recentTx.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                    거래 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, format, note }: { label: string; value: number; format: "number"; note?: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)", boxShadow: "var(--shadow-card)" }}>
      <p className="mb-1 text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
        {format === "number" ? value.toLocaleString() : value}
      </p>
      {note && (
        <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>{note}</p>
      )}
    </div>
  );
}

const CRON_SUMMARY = [
  { name: "실거래가 수집", schedule: "매일 06:00-10:30" },
  { name: "전월세 수집", schedule: "매일 11:00-11:20" },
  { name: "단지 보강", schedule: "매일 12:00" },
  { name: "금리 수집", schedule: "매일 13:00" },
  { name: "데이터 검증", schedule: "매일 14:00" },
  { name: "카드뉴스 생성", schedule: "매일 15:00" },
  { name: "인스타 발행", schedule: "매일 16:00" },
  { name: "푸시 발송", schedule: "매일 17:00" },
];
