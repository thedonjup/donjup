import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 0; // SSR: 항상 최신 데이터

export default async function HomePage() {
  const supabase = await createClient();

  // 폭락 TOP 5
  const { data: drops } = await supabase
    .from("apt_transactions")
    .select("*")
    .eq("is_significant_drop", true)
    .order("change_rate", { ascending: true })
    .limit(5);

  // 신고가 TOP 5
  const { data: highs } = await supabase
    .from("apt_transactions")
    .select("*")
    .eq("is_new_high", true)
    .order("trade_date", { ascending: false })
    .limit(5);

  // 최신 금리
  const { data: rates } = await supabase
    .from("finance_rates")
    .select("*")
    .order("base_date", { ascending: false })
    .limit(5);

  const hasData = (drops && drops.length > 0) || (highs && highs.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 히어로 */}
      <section className="mb-10 rounded-2xl bg-gray-900 p-8 text-white">
        <p className="text-sm font-medium text-gray-400">
          돈줍 데일리 리포트 |{" "}
          {new Date().toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
          {hasData
            ? "오늘 가장 많이 떨어진 아파트는?"
            : "부동산 실거래가 & 금리 대시보드"}
        </h1>
        <p className="mt-2 text-gray-400">
          매일 자동 업데이트되는 아파트 폭락/신고가 랭킹과 금리 변동 정보
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* 왼쪽: 폭락 + 신고가 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 폭락 TOP 5 */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <span className="inline-block h-6 w-1 rounded bg-red-500" />
              최고가 대비 폭락 TOP 5
            </h2>
            {drops && drops.length > 0 ? (
              <div className="space-y-3">
                {drops.map((t, i) => (
                  <TransactionCard
                    key={t.id}
                    rank={i + 1}
                    regionName={t.region_name}
                    aptName={t.apt_name}
                    sizeSqm={t.size_sqm}
                    tradePrice={t.trade_price}
                    highestPrice={t.highest_price}
                    changeRate={t.change_rate}
                    tradeDate={t.trade_date}
                    type="drop"
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="아직 수집된 폭락 거래 데이터가 없습니다." />
            )}
          </section>

          {/* 신고가 TOP 5 */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <span className="inline-block h-6 w-1 rounded bg-green-500" />
              신고가 갱신 TOP 5
            </h2>
            {highs && highs.length > 0 ? (
              <div className="space-y-3">
                {highs.map((t, i) => (
                  <TransactionCard
                    key={t.id}
                    rank={i + 1}
                    regionName={t.region_name}
                    aptName={t.apt_name}
                    sizeSqm={t.size_sqm}
                    tradePrice={t.trade_price}
                    highestPrice={t.highest_price}
                    changeRate={t.change_rate}
                    tradeDate={t.trade_date}
                    type="high"
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="아직 수집된 신고가 거래 데이터가 없습니다." />
            )}
          </section>
        </div>

        {/* 오른쪽 사이드바 */}
        <aside className="space-y-8">
          {/* 금리 현황 */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">금리 현황</h2>
            {rates && rates.length > 0 ? (
              <div className="space-y-3">
                {rates.map((r) => (
                  <RateCard
                    key={r.id}
                    rateType={r.rate_type}
                    rateValue={r.rate_value}
                    changeBp={r.change_bp}
                    baseDate={r.base_date}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                금리 데이터 수집 대기 중...
              </p>
            )}
          </section>

          {/* CTA: 금리 계산기 */}
          <Link
            href="/rate/calculator"
            className="block rounded-xl border-2 border-blue-100 bg-blue-50 p-5 text-center transition hover:border-blue-200 hover:bg-blue-100"
          >
            <p className="text-2xl">🏠</p>
            <p className="mt-2 font-bold text-blue-900">
              대출 이자 계산기
            </p>
            <p className="mt-1 text-sm text-blue-600">
              3억 대출 시 월 이자는 얼마?
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}

function TransactionCard({
  rank,
  regionName,
  aptName,
  sizeSqm,
  tradePrice,
  highestPrice,
  changeRate,
  tradeDate,
  type,
}: {
  rank: number;
  regionName: string;
  aptName: string;
  sizeSqm: number;
  tradePrice: number;
  highestPrice: number | null;
  changeRate: number | null;
  tradeDate: string;
  type: "drop" | "high";
}) {
  const isDrop = type === "drop";
  const rateColor = isDrop ? "text-red-600" : "text-green-600";
  const rateBg = isDrop ? "bg-red-50" : "bg-green-50";
  const arrow = isDrop ? "▼" : "▲";

  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          isDrop ? "bg-red-500" : "bg-green-500"
        }`}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{regionName}</p>
        <p className="font-bold truncate">
          {aptName}{" "}
          <span className="font-normal text-gray-500">{sizeSqm}㎡</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          {highestPrice && (
            <span className="text-gray-400 line-through">
              {formatPrice(highestPrice)}
            </span>
          )}
          <span className="font-semibold">{formatPrice(tradePrice)}</span>
          {changeRate !== null && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${rateBg} ${rateColor}`}
            >
              {arrow} {Math.abs(changeRate)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-300">{tradeDate}</p>
      </div>
    </div>
  );
}

function RateCard({
  rateType,
  rateValue,
  changeBp,
  baseDate,
}: {
  rateType: string;
  rateValue: number;
  changeBp: number | null;
  baseDate: string;
}) {
  const LABELS: Record<string, string> = {
    BASE_RATE: "기준금리",
    COFIX_NEW: "COFIX(신규)",
    COFIX_BAL: "COFIX(잔액)",
    CD_91: "CD 91일",
    TREASURY_3Y: "국고채 3년",
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{LABELS[rateType] || rateType}</p>
        <p className="text-xs text-gray-400">{baseDate}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold">{rateValue}%</p>
        {changeBp !== null && changeBp !== 0 && (
          <p
            className={`text-xs font-medium ${
              changeBp > 0 ? "text-red-500" : "text-blue-500"
            }`}
          >
            {changeBp > 0 ? "▲" : "▼"} {Math.abs(changeBp)}bp
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
      <p className="text-3xl">📊</p>
      <p className="mt-2 text-sm text-gray-400">{message}</p>
      <p className="mt-1 text-xs text-gray-300">
        Cron Job이 실행되면 자동으로 데이터가 채워집니다.
      </p>
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
