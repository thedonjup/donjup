import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "데일리 리포트 아카이브",
  description: "돈줍 데일리 부동산 리포트 전체 목록. 매일 업데이트되는 폭락/신고가 분석.",
};

export const revalidate = 0;

const PAGE_SIZE = 20;

export default async function DailyArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const [{ data: reports }, { count }] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("id,report_date,title,summary")
      .order("report_date", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("daily_reports")
      .select("id", { count: "exact", head: true }),
  ]);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
        <h1 className="text-2xl font-extrabold t-text">데일리 리포트</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        매일 자동 생성되는 아파트 시장 분석 리포트
        {count ? ` · 총 ${count}개` : ""}
      </p>

      <div className="mt-8">
        {reports && reports.length > 0 ? (
          <div className="space-y-2">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/daily/${r.report_date}`}
                className="card-hover flex items-center gap-4 rounded-xl border px-5 py-4"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
              >
                {/* Date badge */}
                <div
                  className="flex-shrink-0 rounded-lg px-3 py-1.5 text-center"
                  style={{ background: "var(--color-surface-elevated)" }}
                >
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                    {r.report_date.slice(5, 7)}월
                  </p>
                  <p className="text-lg font-extrabold tabular-nums t-text">
                    {r.report_date.slice(8, 10)}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate t-text">{r.title}</p>
                  {r.summary && (
                    <p className="mt-0.5 text-sm truncate" style={{ color: "var(--color-text-secondary)" }}>
                      {r.summary}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <span style={{ color: "var(--color-text-tertiary)" }}>&rarr;</span>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border-2 border-dashed p-12 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-xl"
              style={{ background: "var(--color-surface-elevated)" }}
            >
              📋
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              아직 생성된 리포트가 없습니다.
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              매일 자동으로 리포트가 생성됩니다.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={`/daily/archive?page=${currentPage - 1}`}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-80"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                &larr; 이전
              </Link>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {showEllipsis && (
                      <span style={{ color: "var(--color-text-tertiary)" }}>…</span>
                    )}
                    <Link
                      href={`/daily/archive?page=${p}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                        p === currentPage
                          ? "bg-brand-600 text-white"
                          : ""
                      }`}
                      style={
                        p !== currentPage
                          ? { color: "var(--color-text-secondary)" }
                          : undefined
                      }
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}

            {currentPage < totalPages && (
              <Link
                href={`/daily/archive?page=${currentPage + 1}`}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-80"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                다음 &rarr;
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
