import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AdSlot from "@/components/ads/AdSlot";
import CoupangBanner from "@/components/CoupangBanner";
import { formatPrice, RATE_LABELS } from "@/lib/format";

export const revalidate = 0;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "돈줍 DonJup",
  url: "https://donjup.com",
  description: "매일 자동 업데이트되는 아파트 실거래가 폭락/신고가 랭킹과 대출 금리 정보",
  publisher: {
    "@type": "Organization",
    name: "돈줍",
    url: "https://donjup.com",
  },
};

export default async function HomePage() {
  const supabase = await createClient();

  // 폭락 TOP 5
  const { data: drops } = await supabase
    .from("apt_transactions")
    .select("*")
    .not("change_rate", "is", null)
    .lt("change_rate", 0)
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

  // 최근 거래량 통계
  const { count: totalTxns } = await supabase
    .from("apt_transactions")
    .select("id", { count: "exact", head: true });

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero Section */}
      <section className="hero-gradient text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-brand-400" />
            <span>실시간 업데이트</span>
            <span className="mx-1">·</span>
            <span>{today}</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {drops && drops.length > 0 ? (
              <>
                <span className="text-red-400">{drops[0].apt_name}</span>
                <br />
                <span>최고가 대비 </span>
                <span className="text-red-400">{Math.abs(drops[0].change_rate)}%</span>
                <span> 하락</span>
              </>
            ) : (
              <>서울 아파트 실거래가<br />폭락·신고가 랭킹</>
            )}
          </h1>

          <p className="mt-4 max-w-xl text-base text-gray-400 sm:text-lg">
            {drops && drops.length > 0
              ? `${formatPrice(drops[0].highest_price)} → ${formatPrice(drops[0].trade_price)} | 국토교통부 실거래가 기반`
              : "매일 자동 업데이트되는 아파트 폭락/신고가 랭킹과 금리 변동 정보"}
          </p>

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard
              label="폭락 거래"
              value={drops?.length ?? 0}
              suffix="건"
              accent="text-red-400"
            />
            <StatCard
              label="신고가 갱신"
              value={highs?.length ?? 0}
              suffix="건"
              accent="text-brand-400"
            />
            <StatCard
              label="총 수집 거래"
              value={totalTxns ?? 0}
              suffix="건"
              accent="text-gold-400"
            />
            <StatCard
              label="서울 지역"
              value={25}
              suffix="개 구"
              accent="text-blue-400"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdSlot slotId="home-top-banner" format="banner" />

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Left: Rankings */}
          <div className="lg:col-span-2 space-y-10">
            {/* 폭락 TOP 5 */}
            <section>
              <SectionHeader
                icon="drop"
                title="최고가 대비 하락 TOP 5"
                subtitle="최고 거래가 대비 가장 많이 떨어진 아파트"
              />
              {drops && drops.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {drops.map((t, i) => (
                    <TransactionRow
                      key={t.id}
                      rank={i + 1}
                      regionCode={t.region_code}
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
                <EmptyState />
              )}

              <Link
                href="/market"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white py-3 text-sm font-semibold text-gray-600 transition hover:bg-surface-50 hover:text-dark-900"
              >
                서울 25개구 전체 보기
                <span className="text-gray-400">&rarr;</span>
              </Link>
            </section>

            {/* 신고가 TOP 5 */}
            <section>
              <SectionHeader
                icon="rise"
                title="신고가 갱신 TOP 5"
                subtitle="역대 최고 거래가를 경신한 아파트"
              />
              {highs && highs.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {highs.map((t, i) => (
                    <TransactionRow
                      key={t.id}
                      rank={i + 1}
                      regionCode={t.region_code}
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
                <EmptyState />
              )}
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* 금리 현황 */}
            <div className="rounded-2xl border border-surface-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-dark-900">금리 현황</h2>
                <Link href="/rate" className="text-xs text-brand-600 hover:underline">
                  자세히 &rarr;
                </Link>
              </div>
              {rates && rates.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {rates.map((r) => (
                    <RateRow
                      key={r.id}
                      rateType={r.rate_type}
                      rateValue={r.rate_value}
                      changeBp={r.change_bp}
                      baseDate={r.base_date}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-400">
                  금리 데이터 수집 대기 중
                </p>
              )}
            </div>

            {/* CTA: 계산기 */}
            <Link
              href="/rate/calculator"
              className="card-hover block rounded-2xl border-2 border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-xl">
                🏠
              </div>
              <p className="mt-3 font-bold text-brand-900">
                대출 이자 계산기
              </p>
              <p className="mt-1 text-sm text-brand-600">
                3억 대출 시 월 이자는 얼마?
              </p>
            </Link>

            {/* CTA: 데일리 리포트 */}
            <Link
              href={`/daily/${new Date().toISOString().split("T")[0]}`}
              className="card-hover block rounded-2xl border border-surface-200 bg-white p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-dark-900 text-xl text-white">
                📊
              </div>
              <p className="mt-3 font-bold text-dark-900">오늘의 데일리 리포트</p>
              <p className="mt-1 text-sm text-gray-500">
                폭락·신고가·금리·거래량 종합
              </p>
            </Link>

            <CoupangBanner category="book" title="부동산 투자 추천도서" className="hidden lg:block" />

            <AdSlot slotId="home-sidebar-rect" format="rectangle" className="hidden lg:block" />
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Components ── */

function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums ${accent}`}>
        {value.toLocaleString()}
        <span className="ml-0.5 text-xs font-medium text-gray-500">{suffix}</span>
      </p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: "drop" | "rise";
  title: string;
  subtitle: string;
}) {
  const color = icon === "drop" ? "bg-drop" : "bg-rise";
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`inline-block h-5 w-1.5 rounded-full ${color}`} />
        <h2 className="text-lg font-bold text-dark-900">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function TransactionRow({
  rank,
  regionCode,
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
  regionCode: string;
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
  const slug = `${regionCode}-${aptName.replace(/[^가-힣a-zA-Z0-9]/g, "-").replace(/-+/g, "-").toLowerCase()}`;

  return (
    <Link href={`/apt/${regionCode}/${slug}`} className="block">
      <div className="card-hover flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-4 py-3.5">
        {/* Rank */}
        <div className={`rank-badge ${isDrop ? "rank-badge-drop" : "rank-badge-rise"}`}>
          {rank}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-dark-900">{aptName}</p>
            <span className="flex-shrink-0 text-xs text-gray-400">{sizeSqm}㎡</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {regionName} · {tradeDate}
          </p>
        </div>

        {/* Price */}
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-2">
            {highestPrice && isDrop && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(highestPrice)}
              </span>
            )}
            <span className="font-bold tabular-nums text-dark-900">
              {formatPrice(tradePrice)}
            </span>
          </div>
          {changeRate !== null && (
            <span
              className={`mt-0.5 inline-block text-xs font-bold tabular-nums ${
                isDrop ? "text-drop" : "text-rise"
              }`}
            >
              {isDrop ? "▼" : "▲"} {Math.abs(changeRate)}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function RateRow({
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
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-dark-900">{RATE_LABELS[rateType] || rateType}</p>
        <p className="text-[11px] text-gray-400">{baseDate}</p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold tabular-nums text-dark-900">{rateValue}%</p>
        {changeBp !== null && changeBp !== 0 && (
          <p
            className={`text-[11px] font-semibold tabular-nums ${
              changeBp > 0 ? "text-drop" : "text-brand-600"
            }`}
          >
            {changeBp > 0 ? "▲" : "▼"} {Math.abs(changeBp)}bp
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed border-surface-200 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-xl">
        📊
      </div>
      <p className="mt-3 text-sm text-gray-500">데이터 수집 중입니다</p>
      <p className="mt-1 text-xs text-gray-400">
        매일 밤 자동으로 업데이트됩니다
      </p>
    </div>
  );
}

