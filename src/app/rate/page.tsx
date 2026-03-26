import { createClient } from "@/lib/db/server";
import Link from "next/link";
import type { Metadata } from "next";
import AdSlot from "@/components/ads/AdSlot";
import { RATE_LABELS, RATE_DESCRIPTIONS, RATE_ORDER } from "@/lib/format";
import MiniAreaChart from "@/components/charts/MiniAreaChartWrapper";
import { FaqJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "금리 현황",
  description: "한국은행 기준금리, COFIX, CD금리, 국고채 금리 실시간 추이. 매일 자동 업데이트.",
  alternates: { canonical: "/rate" },
};

export const revalidate = 1800;

/** 은행 코드 → 한글명 매핑 */
const BANK_LABELS: Record<string, string> = {
  BANK_KB: "KB국민은행",
  BANK_SHINHAN: "신한은행",
  BANK_WOORI: "우리은행",
  BANK_HANA: "하나은행",
  BANK_NH: "NH농협은행",
  BANK_IBK: "IBK기업은행",
  BANK_KAKAO: "카카오뱅크",
  BANK_KBANK: "케이뱅크",
  BANK_TOSS: "토스뱅크",
  BANK_SC: "SC제일은행",
  BANK_CITI: "한국씨티은행",
  BANK_BUSAN: "부산은행",
  BANK_DAEGU: "대구은행",
  BANK_GWANGJU: "광주은행",
  BANK_JEONBUK: "전북은행",
  BANK_GYEONGNAM: "경남은행",
  BANK_JEJU: "제주은행",
  BANK_SUHYUP: "수협은행",
};

export default async function RateDashboardPage() {
  let allRates: any[] | null = null;
  let bankRatesRaw: any[] | null = null;

  try {
    const supabase = await createClient();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);

    const [ratesRes, bankRes] = await Promise.all([
      supabase
        .from("finance_rates")
        .select("rate_type,rate_value,prev_value,change_bp,base_date,source")
        .order("base_date", { ascending: false })
        .limit(100)
        .abortSignal(ac.signal),
      supabase
        .from("finance_rates")
        .select("rate_type, rate_value, prev_value, change_bp, base_date")
        .like("rate_type", "BANK_%")
        .neq("rate_type", "BANK_PRODUCTS_ALL")
        .order("base_date", { ascending: false })
        .limit(100)
        .abortSignal(ac.signal),
    ]);

    clearTimeout(timer);
    allRates = ratesRes.data;
    bankRatesRaw = bankRes.data;
  } catch {
    // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
  }

  // 은행별 최신 금리만 추출
  const bankRates = new Map<string, {
    rate_type: string;
    rate_value: number;
    prev_value: number | null;
    change_bp: number | null;
    base_date: string;
  }>();
  for (const r of bankRatesRaw ?? []) {
    if (!bankRates.has(r.rate_type)) {
      r.base_date = r.base_date instanceof Date ? r.base_date.toISOString().split("T")[0] : String(r.base_date ?? "");
      bankRates.set(r.rate_type, r);
    }
  }
  const sortedBankRates = Array.from(bankRates.values()).sort(
    (a, b) => a.rate_value - b.rate_value
  );

  const latestByType = new Map<string, {
    rate_type: string;
    rate_value: number;
    prev_value: number | null;
    change_bp: number | null;
    base_date: string;
  }>();

  const historyByType = new Map<string, Array<{ date: string; value: number }>>();

  for (const r of allRates ?? []) {
    r.base_date = r.base_date instanceof Date ? r.base_date.toISOString().split("T")[0] : String(r.base_date ?? "");
    if (!latestByType.has(r.rate_type)) {
      latestByType.set(r.rate_type, r);
    }
    const history = historyByType.get(r.rate_type) ?? [];
    history.push({ date: r.base_date, value: r.rate_value });
    historyByType.set(r.rate_type, history);
  }

  const hasData = latestByType.size > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, { name: "금리 현황", href: "/rate" }]} />
      <FaqJsonLd
        items={[
          {
            question: "현재 한국은행 기준금리는 얼마인가요?",
            answer:
              "한국은행 기준금리는 금통위 회의 결과에 따라 변동됩니다. 돈줍 금리 현황 페이지에서 최신 기준금리와 변동 추이를 실시간으로 확인하실 수 있습니다.",
          },
          {
            question: "COFIX 금리란 무엇인가요?",
            answer:
              "COFIX(Cost of Funds Index)는 은행의 자금 조달 비용을 반영한 기준금리로, 주택담보대출 변동금리의 기준이 됩니다. 신규취급액 기준과 잔액 기준이 있습니다.",
          },
          {
            question: "주담대 금리를 가장 낮게 받으려면 어떻게 해야 하나요?",
            answer:
              "은행별로 금리 우대 조건이 다르므로, 돈줍의 은행별 금리 비교 기능을 활용하여 최저금리 은행을 확인하고, 급여이체, 카드 사용 등 우대 조건을 충족하는 것이 좋습니다.",
          },
        ]}
      />
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text">금리 현황</h1>
        </div>
        <p className="text-sm t-text-secondary">
          주택담보대출과 관련된 주요 금리 지표를 한눈에 확인하세요.
        </p>
      </div>

      {hasData ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RATE_ORDER.map((type) => {
              const rate = latestByType.get(type);
              if (!rate) return null;
              return (
                <RateDetailCard
                  key={type}
                  label={RATE_LABELS[type] ?? type}
                  description={RATE_DESCRIPTIONS[type] ?? ""}
                  value={rate.rate_value}
                  changeBp={rate.change_bp}
                  baseDate={rate.base_date}
                  history={historyByType.get(type)?.reverse() ?? []}
                />
              );
            })}
          </div>

          <AdSlot slotId="rate-mid-banner" format="banner" />

          {/* 은행별 주담대 금리 */}
          {sortedBankRates.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-bold t-text">은행별 주담대 금리</h2>
              <p className="mb-3 text-xs t-text-tertiary">
                금융감독원 금융상품한눈에 기준 | {sortedBankRates[0]?.base_date}
              </p>
              <div className="rounded-2xl border t-border t-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b t-elevated text-left text-xs t-text-secondary">
                      <th className="px-4 py-3">은행명</th>
                      <th className="px-4 py-3 text-right">최저금리</th>
                      <th className="px-4 py-3 text-right">변동</th>
                      <th className="px-4 py-3 text-right">기준일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBankRates.map((bank) => (
                      <tr key={bank.rate_type} className="border-b t-border last:border-0">
                        <td className="px-4 py-3 font-medium t-text">
                          {BANK_LABELS[bank.rate_type] ?? bank.rate_type.replace("BANK_", "")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums t-text">
                          {bank.rate_value}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          {bank.change_bp !== null && bank.change_bp !== 0 ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                bank.change_bp > 0
                                  ? "t-drop-bg t-drop"
                                  : "t-rise-bg t-rise"
                              }`}
                            >
                              {bank.change_bp > 0 ? "+" : ""}{bank.change_bp}bp
                            </span>
                          ) : (
                            <span className="t-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right t-text-tertiary">
                          {bank.base_date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-bold t-text">최근 금리 변동 이력</h2>
            <div className="rounded-2xl border t-border t-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b t-elevated text-left text-xs t-text-secondary">
                    <th className="px-4 py-3">지표</th>
                    <th className="px-4 py-3 text-right">현재</th>
                    <th className="px-4 py-3 text-right">이전</th>
                    <th className="px-4 py-3 text-right">변동</th>
                    <th className="px-4 py-3 text-right">기준일</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_ORDER.map((type) => {
                    const rate = latestByType.get(type);
                    if (!rate) return null;
                    return (
                      <tr key={type} className="border-b t-border last:border-0">
                        <td className="px-4 py-3 font-medium t-text">
                          {RATE_LABELS[type]}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums t-text">
                          {rate.rate_value}%
                        </td>
                        <td className="px-4 py-3 text-right t-text-tertiary tabular-nums">
                          {rate.prev_value !== null ? `${rate.prev_value}%` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {rate.change_bp !== null && rate.change_bp !== 0 ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                rate.change_bp > 0
                                  ? "t-drop-bg t-drop"
                                  : "t-rise-bg t-rise"
                              }`}
                            >
                              {rate.change_bp > 0 ? "▲" : "▼"}{" "}
                              {Math.abs(rate.change_bp)}bp
                            </span>
                          ) : (
                            <span className="t-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right t-text-tertiary">
                          {rate.base_date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-2xl border-2 border-dashed t-border p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl t-elevated text-xl">
            📊
          </div>
          <p className="mt-3 text-sm t-text-secondary">
            아직 수집된 금리 데이터가 없습니다.
          </p>
          <p className="mt-1 text-xs t-text-tertiary">
            ECOS API 키가 설정되면 매일 자동으로 금리 데이터가 수집됩니다.
          </p>
        </div>
      )}

      {/* Calculator Tools */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold t-text">대출/부동산 도구</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/rate/calculator"
            className="card-hover rounded-2xl border-2 brand-tint-border p-6 text-center t-card"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl brand-tint-icon-bg text-sm font-bold text-brand-600">
              %%
            </div>
            <p className="mt-2 font-bold t-text">대출 이자 계산기</p>
            <p className="mt-1 text-sm text-brand-600">
              원리금균등/원금균등 비교 계산
            </p>
          </Link>
          <Link
            href="/rate/calculator?tab=dsr"
            className="card-hover rounded-2xl border-2 brand-tint-border p-6 text-center t-card"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl brand-tint-icon-bg text-sm font-bold text-brand-600">
              DSR
            </div>
            <p className="mt-2 font-bold t-text">DSR 계산기</p>
            <p className="mt-1 text-sm text-brand-600">
              총부채원리금상환비율 확인
            </p>
          </Link>
          <Link
            href="/rate/calculator?tab=jeonse"
            className="card-hover rounded-2xl border t-border t-card p-6 text-center"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl t-elevated text-sm font-bold t-text">
              전/월
            </div>
            <p className="mt-2 font-bold t-text">전세-월세 전환</p>
            <p className="mt-1 text-sm t-text-secondary">
              전세 보증금을 월세로 환산
            </p>
          </Link>
        </div>
      </section>

      {/* Quick Links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/"
          className="card-hover rounded-2xl border t-border t-card p-5 flex items-center gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dark-900 text-sm font-bold text-white">
            TOP
          </div>
          <div>
            <p className="font-bold t-text">폭락/신고가 랭킹</p>
            <p className="text-sm t-text-secondary">오늘 가장 많이 떨어진 아파트 확인</p>
          </div>
        </Link>
        <Link
          href="/daily/archive"
          className="card-hover rounded-2xl border t-border t-card p-5 flex items-center gap-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl t-elevated text-sm font-bold t-text">
            Daily
          </div>
          <div>
            <p className="font-bold t-text">데일리 리포트</p>
            <p className="text-sm t-text-secondary">매일 업데이트되는 시장 동향</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function RateDetailCard({
  label,
  description,
  value,
  changeBp,
  baseDate,
  history,
}: {
  label: string;
  description: string;
  value: number;
  changeBp: number | null;
  baseDate: string;
  history: Array<{ date: string; value: number }>;
}) {
  return (
    <div className="card-hover rounded-2xl border t-border t-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium t-text-secondary">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums t-text">{value}%</p>
        </div>
        {changeBp !== null && changeBp !== 0 && (
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ${
              changeBp > 0 ? "t-drop-bg t-drop" : "t-rise-bg t-rise"
            }`}
          >
            {changeBp > 0 ? "▲" : "▼"} {Math.abs(changeBp)}bp
          </span>
        )}
      </div>
      <p className="mt-1 text-xs t-text-tertiary">{description}</p>
      <p className="mt-0.5 text-[11px] t-text-tertiary">기준일: {baseDate}</p>

      {history.length > 1 && (
        <div className="mt-3">
          <MiniAreaChart
            data={history.slice(-12).map((h) => ({ value: h.value }))}
            color={changeBp !== null && changeBp > 0 ? "#ef4444" : "#059669"}
            height={48}
          />
        </div>
      )}
    </div>
  );
}
