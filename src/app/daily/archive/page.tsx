import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "데일리 리포트 아카이브",
  description: "돈줍 데일리 부동산 리포트 전체 목록. 매일 업데이트되는 폭락/신고가 분석.",
};

export const revalidate = 0;

export default async function DailyArchivePage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id,report_date,title,summary")
    .order("report_date", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">데일리 리포트</h1>
      <p className="mt-1 text-sm text-gray-500">
        매일 자동 생성되는 아파트 시장 분석 리포트
      </p>

      <div className="mt-8">
        {reports && reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/daily/${r.report_date}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{r.title}</p>
                    {r.summary && (
                      <p className="mt-1 text-sm text-gray-500 truncate">
                        {r.summary}
                      </p>
                    )}
                  </div>
                  <time className="flex-shrink-0 text-sm text-gray-400">
                    {r.report_date}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <p className="text-3xl">📋</p>
            <p className="mt-3 text-gray-500">아직 생성된 리포트가 없습니다.</p>
            <p className="mt-1 text-sm text-gray-400">
              매일 자동으로 리포트가 생성됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
