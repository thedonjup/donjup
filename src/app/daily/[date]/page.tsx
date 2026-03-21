import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 0;

interface ReportTransaction {
  id: string;
  region_name: string;
  apt_name: string;
  size_sqm: number;
  trade_price: number;
  highest_price: number | null;
  change_rate: number | null;
  trade_date: string;
}

interface ReportRate {
  rate_type: string;
  rate_value: number;
  prev_value: number | null;
  change_bp: number | null;
  base_date: string;
}

interface VolumeItem {
  region: string;
  count: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `${date} 데일리 리포트`,
    description: `${date} 아파트 폭락/신고가 랭킹 및 금리 변동 리포트`,
  };
}

export default async function DailyReportPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("report_date", date)
    .single();

  if (!report) {
    notFound();
  }

  const topDrops = (report.top_drops ?? []) as ReportTransaction[];
  const topHighs = (report.top_highs ?? []) as ReportTransaction[];
  const rateSummary = (report.rate_summary ?? []) as ReportRate[];
  const volumeSummary = (report.volume_summary ?? []) as VolumeItem[];

  const RATE_LABELS: Record<string, string> = {
    BASE_RATE: "기준금리",
    COFIX_NEW: "COFIX(신규)",
    COFIX_BAL: "COFIX(잔액)",
    CD_91: "CD 91일",
    TREASURY_3Y: "국고채 3년",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-2">
        <Link
          href="/daily/archive"
          className="text-sm text-blue-600 hover:underline"
        >
          ← 리포트 목록
        </Link>
      </div>
      <h1 className="text-2xl font-bold">{report.title}</h1>
      <p className="mt-1 text-sm text-gray-500">{report.summary}</p>
      <p className="mt-1 text-xs text-gray-400">{report.report_date}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* 좌측: 폭락 + 신고가 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 폭락 */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <span className="inline-block h-6 w-1 rounded bg-red-500" />
              최고가 대비 폭락 TOP
            </h2>
            {topDrops.length > 0 ? (
              <div className="space-y-3">
                {topDrops.map((t, i) => (
                  <TxnCard key={t.id} rank={i + 1} txn={t} type="drop" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">폭락 거래 데이터 없음</p>
            )}
          </section>

          {/* 신고가 */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <span className="inline-block h-6 w-1 rounded bg-green-500" />
              신고가 갱신 TOP
            </h2>
            {topHighs.length > 0 ? (
              <div className="space-y-3">
                {topHighs.map((t, i) => (
                  <TxnCard key={t.id} rank={i + 1} txn={t} type="high" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">신고가 데이터 없음</p>
            )}
          </section>
        </div>

        {/* 우측 사이드바 */}
        <aside className="space-y-6">
          {/* 금리 요약 */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-bold">금리 현황</h2>
            {rateSummary.length > 0 ? (
              <div className="space-y-3">
                {rateSummary.map((r) => (
                  <div key={r.rate_type} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {RATE_LABELS[r.rate_type] ?? r.rate_type}
                      </p>
                      <p className="text-xs text-gray-400">{r.base_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{r.rate_value}%</p>
                      {r.change_bp !== null && r.change_bp !== 0 && (
                        <p
                          className={`text-xs font-medium ${
                            r.change_bp > 0 ? "text-red-500" : "text-blue-500"
                          }`}
                        >
                          {r.change_bp > 0 ? "▲" : "▼"} {Math.abs(r.change_bp)}bp
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">금리 데이터 없음</p>
            )}
          </section>

          {/* 거래량 핫스팟 */}
          {volumeSummary.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-bold">거래량 핫스팟</h2>
              <div className="space-y-2">
                {volumeSummary.map((v, i) => (
                  <div key={v.region} className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="mr-2 text-xs text-gray-400">{i + 1}</span>
                      {v.region}
                    </span>
                    <span className="text-sm font-bold">{v.count}건</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Link
            href="/rate/calculator"
            className="block rounded-xl border-2 border-blue-100 bg-blue-50 p-5 text-center transition hover:border-blue-200"
          >
            <p className="font-bold text-blue-900">대출 이자 계산기</p>
            <p className="mt-1 text-sm text-blue-600">내 이자 얼마?</p>
          </Link>
        </aside>
      </div>
    </div>
  );
}

function TxnCard({
  rank,
  txn,
  type,
}: {
  rank: number;
  txn: ReportTransaction;
  type: "drop" | "high";
}) {
  const isDrop = type === "drop";
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          isDrop ? "bg-red-500" : "bg-green-500"
        }`}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{txn.region_name}</p>
        <p className="font-bold truncate">
          {txn.apt_name}{" "}
          <span className="font-normal text-gray-500">{txn.size_sqm}㎡</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          {txn.highest_price && (
            <span className="text-gray-400 line-through">
              {formatPrice(txn.highest_price)}
            </span>
          )}
          <span className="font-semibold">{formatPrice(txn.trade_price)}</span>
          {txn.change_rate !== null && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                isDrop ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              }`}
            >
              {isDrop ? "▼" : "▲"} {Math.abs(txn.change_rate)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-300">{txn.trade_date}</p>
      </div>
    </div>
  );
}

function formatPrice(priceInManWon: number): string {
  if (priceInManWon >= 10000) {
    const eok = Math.floor(priceInManWon / 10000);
    const rest = priceInManWon % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${priceInManWon.toLocaleString()}만`;
}
