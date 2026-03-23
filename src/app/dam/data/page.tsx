"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DataQualityCheck {
  label: string;
  description: string;
  count: number | null;
  severity: "error" | "warn" | "ok";
}

export default function DataQualityPage() {
  const [checks, setChecks] = useState<DataQualityCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runChecks() {
      try {
        const supabase = createClient();

        const [nullHighest, nullGeo, totalComplexes, totalTx] = await Promise.all([
          supabase.from("complexes").select("*", { count: "exact", head: true }).is("highest_price", null),
          supabase.from("complexes").select("*", { count: "exact", head: true }).is("lat", null),
          supabase.from("complexes").select("*", { count: "exact", head: true }),
          supabase.from("transactions").select("*", { count: "exact", head: true }),
        ]);

        const nullHighestCount = nullHighest.count ?? 0;
        const nullGeoCount = nullGeo.count ?? 0;
        const totalCx = totalComplexes.count ?? 0;

        setChecks([
          {
            label: "highest_price NULL",
            description: "최고가 정보가 없는 단지 수",
            count: nullHighestCount,
            severity: nullHighestCount > 100 ? "error" : nullHighestCount > 0 ? "warn" : "ok",
          },
          {
            label: "좌표 정보 누락",
            description: "위도/경도가 없는 단지 수",
            count: nullGeoCount,
            severity: nullGeoCount > 100 ? "error" : nullGeoCount > 0 ? "warn" : "ok",
          },
          {
            label: "총 등록 단지",
            description: "complexes 테이블 전체 행 수",
            count: totalCx,
            severity: "ok",
          },
          {
            label: "총 거래 건수",
            description: "transactions 테이블 전체 행 수",
            count: totalTx.count ?? 0,
            severity: "ok",
          },
        ]);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    runChecks();
  }, []);

  const severityStyle = (s: string) => {
    if (s === "error") return { bg: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" };
    if (s === "warn") return { bg: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" };
    return { bg: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" };
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>데이터 품질</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {checks.map((check) => {
            const style = severityStyle(check.severity);
            return (
              <div
                key={check.label}
                className="rounded-lg border p-5"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {check.label}
                    </h3>
                    <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {check.description}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {check.count?.toLocaleString() ?? "-"}
                  </span>
                </div>
                <div className="mt-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {check.severity === "ok" ? "정상" : check.severity === "warn" ? "주의" : "위험"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
