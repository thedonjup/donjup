"use client";

import { useEffect, useState } from "react";

type Tab = "cardnews" | "seeding" | "insta";

interface ContentItem {
  id: number;
  title: string;
  status: string;
  platform: string;
  created_at: string;
  content_type: string;
}

export default function ContentManagement() {
  const [tab, setTab] = useState<Tab>("cardnews");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dam/content?tab=${tab}`);
      if (!res.ok) throw new Error("API 요청 실패");
      const data = await res.json();
      setItems((data.items as ContentItem[]) ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (id: number, action: "posted" | "hold" | "deleted") => {
    setActionLoading(id);
    try {
      await fetch("/api/dam/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: action }),
      });
      await fetchItems();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      ready: { bg: "var(--color-semantic-rise-bg)", color: "var(--color-semantic-rise)" },
      posted: { bg: "#dbeafe", color: "#2563eb" },
      failed: { bg: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" },
      hold: { bg: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" },
    };
    const s = styles[status] || { bg: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" };
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>콘텐츠 관리</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--color-surface-elevated)" }}>
        {([
          { key: "cardnews" as Tab, label: "카드뉴스" },
          { key: "seeding" as Tab, label: "시딩" },
          { key: "insta" as Tab, label: "인스타" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "shadow-sm" : ""
            }`}
            style={{
              background: tab === t.key ? "var(--color-surface-card)" : "transparent",
              color: tab === t.key ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {tab === "cardnews" && "카드뉴스 콘텐츠가 없습니다."}
            {tab === "seeding" && "시딩 콘텐츠가 없습니다."}
            {tab === "insta" && "발행된 인스타 콘텐츠가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>제목</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>플랫폼</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>상태</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>생성일</th>
                  {tab === "cardnews" && (
                    <th className="px-4 py-2.5 text-right text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>액션</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td className="max-w-[300px] truncate px-4 py-2.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {item.title || `#${item.id}`}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
                      {item.platform || "-"}
                    </td>
                    <td className="px-4 py-2.5">{statusBadge(item.status)}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(item.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    {tab === "cardnews" && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === "ready" && (
                            <>
                              <button
                                onClick={() => handleAction(item.id, "posted")}
                                disabled={actionLoading === item.id}
                                className="rounded px-2 py-1 text-xs font-medium text-white transition hover:opacity-80 disabled:opacity-50"
                                style={{ background: "#2563eb" }}
                              >
                                발행
                              </button>
                              <button
                                onClick={() => handleAction(item.id, "hold")}
                                disabled={actionLoading === item.id}
                                className="rounded px-2 py-1 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                                style={{ background: "var(--color-semantic-warn-bg)", color: "var(--color-semantic-warn)" }}
                              >
                                보류
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleAction(item.id, "deleted")}
                            disabled={actionLoading === item.id}
                            className="rounded px-2 py-1 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                            style={{ background: "var(--color-semantic-drop-bg)", color: "var(--color-semantic-drop)" }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
