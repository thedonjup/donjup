"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string;
}

export default function AptNews({
  aptName,
  regionName,
}: {
  aptName: string;
  regionName: string;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const query = `${aptName} ${regionName} 부동산`;

    fetch(`/api/news?q=${encodeURIComponent(query)}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: NewsItem[]) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [aptName, regionName]);

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface-card)",
      }}
    >
      <h2 className="mb-1 font-bold t-text">관련 뉴스</h2>
      <p
        className="mb-4 text-xs"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        AI가 수집한 관련 뉴스입니다. 정확도가 다를 수 있습니다.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div
                className="h-4 rounded"
                style={{
                  background: "var(--color-surface-elevated)",
                  width: `${80 - i * 10}%`,
                }}
              />
              <div
                className="h-3 rounded"
                style={{
                  background: "var(--color-surface-elevated)",
                  width: "40%",
                }}
              />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p
          className="py-4 text-center text-sm"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          관련 뉴스가 없습니다
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <p className="text-sm font-medium t-text group-hover:text-brand-600 transition-colors line-clamp-2">
                  {item.title}
                </p>
                <p
                  className="mt-1 text-xs line-clamp-1"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {item.source}
                  {item.pubDate && ` · ${formatDate(item.pubDate)}`}
                </p>
                {item.description && (
                  <p
                    className="mt-0.5 text-xs line-clamp-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {item.description}
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "방금 전";
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;

    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}
