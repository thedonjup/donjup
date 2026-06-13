"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchDamApi } from "@/lib/dam-api-client";

interface DataQualityCheck {
  label: string;
  description: string;
  count: number | null;
  severity: "error" | "warn" | "ok";
}

interface DataQualityResponse {
  checks?: DataQualityCheck[];
}

export default function DataQualityPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<DataQualityCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const currentUser = user;
    let cancelled = false;

    async function runChecks() {
      try {
        setLoading(true);
        const idToken = await currentUser.getIdToken();
        const data = await fetchDamApi<DataQualityResponse>("/api/dam/data", idToken);
        if (!cancelled) {
          setChecks(data.checks ?? []);
        }
      } catch {
        if (!cancelled) {
          setChecks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void runChecks();

    return () => {
      cancelled = true;
    };
  }, [user]);

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
