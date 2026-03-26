import { createClient } from "@/lib/db/server";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import ShareButtons from "@/components/ShareButtons";
import { formatPrice, RATE_LABELS } from "@/lib/format";

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
    alternates: { canonical: `/daily/${date}` },
  };
}

export default async function DailyReportPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const supabase = await createClient();

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);

  let report: any = null;
  try {
    const { data } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("report_date", date)
      .abortSignal(ac.signal)
      .single();
    report = data;
    clearTimeout(timer);
  } catch {
    clearTimeout(timer);
  }

  if (!report) {
    notFound();
  }

  const topDrops = (report.top_drops ?? []) as ReportTransaction[];
  const topHighs = (report.top_highs ?? []) as ReportTransaction[];
  const rateSummary = (report.rate_summary ?? []) as ReportRate[];
  const volumeSummary = (report.volume_summary ?? []) as VolumeItem[];


  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/daily/archive"
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          &larr; 리포트 목록
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/daily/${getPrevDate(date)}`}
            className="rounded-lg border border-surface-200 px-3 py-1.5 t-text-secondary transition hover:bg-surface-50 hover:t-text"
          >
            &larr; 이전
          </Link>
          <Link
            href={`/daily/${getNextDate(date)}`}
            className="rounded-lg border border-surface-200 px-3 py-1.5 t-text-secondary transition hover:bg-surface-50 hover:t-text"
          >
            다음 &rarr;
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-medium text-brand-600">{report.report_date}</p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold t-text">{report.title}</h1>
          <ShareButtons
            url={`https://donjup.com/daily/${date}`}
            title={report.title}
            description={report.summary}
          />
        </div>
        <p className="mt-2 text-sm t-text-secondary">{report.summary}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Rankings */}
        <div className="lg:col-span-2 space-y-8">
          {/* 폭락 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block h-5 w-1.5 rounded-full bg-drop" />
              <h2 className="text-lg font-bold t-text">최고가 대비 하락 TOP</h2>
            </div>
            {topDrops.length > 0 ? (
              <div className="space-y-2">
                {topDrops.map((t, i) => (
                  <TxnCard key={t.id} rank={i + 1} txn={t} type="drop" />
                ))}
              </div>
            ) : (
              <p className="text-sm t-text-tertiary">폭락 거래 데이터 없음</p>
            )}
          </section>

          <AdSlot slotId="daily-mid-infeed" format="infeed" />

          {/* 신고가 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block h-5 w-1.5 rounded-full bg-rise" />
              <h2 className="text-lg font-bold t-text">신고가 갱신 TOP</h2>
            </div>
            {topHighs.length > 0 ? (
              <div className="space-y-2">
                {topHighs.map((t, i) => (
                  <TxnCard key={t.id} rank={i + 1} txn={t} type="high" />
                ))}
              </div>
            ) : (
              <p className="text-sm t-text-tertiary">신고가 데이터 없음</p>
            )}
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-6">
          {/* 금리 요약 */}
          <div className="rounded-2xl border t-border bg-[var(--color-surface-card)] p-5">
            <h2 className="font-bold t-text">금리 현황</h2>
            {rateSummary.length > 0 ? (
              <div className="mt-4 space-y-3">
                {rateSummary.map((r) => (
                  <div key={r.rate_type} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium t-text">
                        {RATE_LABELS[r.rate_type] ?? r.rate_type}
                      </p>
                      <p className="text-[11px] t-text-tertiary">{r.base_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold tabular-nums">{r.rate_value}%</p>
                      {r.change_bp !== null && r.change_bp !== 0 && (
                        <p
                          className={`text-[11px] font-semibold tabular-nums ${
                            r.change_bp > 0 ? "text-drop" : "text-brand-600"
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
              <p className="mt-4 text-sm t-text-tertiary">금리 데이터 없음</p>
            )}
          </div>

          {/* 거래량 핫스팟 */}
          {volumeSummary.length > 0 && (
            <div className="rounded-2xl border t-border bg-[var(--color-surface-card)] p-5">
              <h2 className="font-bold t-text">거래량 핫스팟</h2>
              <div className="mt-4 space-y-2">
                {volumeSummary.map((v, i) => {
                  const maxCount = volumeSummary[0]?.count || 1;
                  const width = Math.max((v.count / maxCount) * 100, 8);
                  return (
                    <div key={v.region}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="rank-badge rank-badge-gold text-[10px]">{i + 1}</span>
                          <span className="font-medium t-text">{v.region}</span>
                        </span>
                        <span className="font-bold tabular-nums t-text">{v.count}건</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-100">
                        <div
                          className="h-1.5 rounded-full bg-brand-400"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Link
            href="/rate/calculator"
            className="card-hover block rounded-2xl border-2 border-brand-100 bg-gradient-to-br from-brand-50/30 to-transparent p-5 text-center"
          >
            <p className="font-bold text-brand-900">대출 이자 계산기</p>
            <p className="mt-1 text-sm text-brand-600">내 이자 얼마?</p>
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
    <div className="card-hover flex items-center gap-3 rounded-xl border t-border bg-[var(--color-surface-card)] px-4 py-3.5">
      <div className={`rank-badge ${isDrop ? "rank-badge-drop" : "rank-badge-rise"}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold t-text">{txn.apt_name}</p>
          <span className="flex-shrink-0 text-xs t-text-tertiary">{txn.size_sqm}㎡</span>
        </div>
        <p className="mt-0.5 text-xs t-text-tertiary">
          {txn.region_name} · {txn.trade_date}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-2">
          {txn.highest_price && isDrop && (
            <span className="text-xs t-text-tertiary line-through">
              {formatPrice(txn.highest_price)}
            </span>
          )}
          <span className="font-bold tabular-nums t-text">
            {formatPrice(txn.trade_price)}
          </span>
        </div>
        {txn.change_rate !== null && (
          <span
            className={`mt-0.5 inline-block text-xs font-bold tabular-nums ${
              isDrop ? "text-drop" : "text-rise"
            }`}
          >
            {isDrop ? "▼" : "▲"} {Math.abs(txn.change_rate)}%
          </span>
        )}
      </div>
    </div>
  );
}

function getPrevDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getNextDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

