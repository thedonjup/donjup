import { formatPrice } from "@/lib/format";

interface Transaction {
  apt_name: string;
  drop_level?: string | null;
  change_rate?: number | null;
  highest_price?: number | null;
  trade_price: number;
  region_name: string;
}

interface HeroSectionProps {
  heroTx: Transaction | null;
  heroHigh: Transaction | null;
  today: string;
}

export default function HeroSection({ heroTx, heroHigh, today }: HeroSectionProps) {
  return (
    <section className="hero-gradient text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-brand-400" />
          <span>실시간 업데이트</span>
          <span className="mx-1">·</span>
          <span>{today}</span>
        </div>

        <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {heroTx ? (
            <>
              <span className="text-red-400">{heroTx.apt_name}</span>
              <br />
              <span>최고가 대비 </span>
              <span
                className="inline-block rounded-lg px-3 py-1"
                style={{
                  backgroundColor:
                    heroTx.drop_level === "severe"
                      ? "rgba(220,38,38,0.2)"
                      : heroTx.drop_level === "crash"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(245,158,11,0.2)",
                  color:
                    heroTx.drop_level === "severe"
                      ? "#dc2626"
                      : heroTx.drop_level === "crash"
                        ? "#ef4444"
                        : "#f59e0b",
                }}
              >
                -{Math.abs(heroTx.change_rate!)}%
              </span>
              <span>
                {" "}
                {heroTx.drop_level === "severe"
                  ? "대폭락"
                  : heroTx.drop_level === "crash"
                    ? "폭락"
                    : "하락"}
              </span>
            </>
          ) : heroHigh ? (
            <>
              <span className="text-brand-400">{heroHigh.apt_name}</span>
              <br />
              <span>신고가 </span>
              <span className="inline-block rounded-lg bg-brand-500/20 px-3 py-1 text-brand-400">
                {formatPrice(heroHigh.trade_price)}
              </span>
              <span> 경신</span>
            </>
          ) : (
            <>
              전국 아파트 실거래가
              <br />
              폭락·신고가 랭킹
            </>
          )}
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-gray-400 sm:text-xl">
          {heroTx
            ? `${formatPrice(heroTx.highest_price!)} → ${formatPrice(heroTx.trade_price)} | ${heroTx.region_name} · 국토교통부 실거래가 기반`
            : heroHigh
              ? `${heroHigh.region_name} · 국토교통부 실거래가 기반`
              : "매일 자동 업데이트되는 전국 아파트 폭락/신고가 랭킹과 금리 변동 정보"}
        </p>
      </div>
    </section>
  );
}
