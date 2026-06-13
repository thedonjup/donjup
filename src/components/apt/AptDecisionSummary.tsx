import TrackedLink from "@/components/analytics/TrackedLink";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";

interface AptDecisionSummaryProps {
  aptName: string;
  complexId: string;
  latestPrice: number;
  highestPrice: number;
  changeFromMax: string | null;
  latestSize: number | null;
  latestFloor: number | null;
  rentCount: number;
  nearbyCount: number;
}

function SummaryItem({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "drop" | "rise";
}) {
  const valueClass =
    tone === "drop" ? "t-drop" : tone === "rise" ? "t-rise" : "t-text";

  return (
    <div className="min-w-0 rounded-lg border t-border bg-[var(--color-surface-page)] p-3">
      <p className="text-[11px] font-semibold t-text-tertiary">{label}</p>
      <p className={`mt-1 truncate text-sm font-extrabold tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] t-text-tertiary">{hint}</p>
    </div>
  );
}

export default function AptDecisionSummary({
  aptName,
  complexId,
  latestPrice,
  highestPrice,
  changeFromMax,
  latestSize,
  latestFloor,
  rentCount,
  nearbyCount,
}: AptDecisionSummaryProps) {
  const changeValue = changeFromMax ? `${changeFromMax}%` : "-";
  const changeNumber = changeFromMax ? Number(changeFromMax) : null;
  const latestMeta =
    latestSize !== null
      ? `${formatSizeWithPyeong(latestSize)}${latestFloor ? ` · ${latestFloor}층` : ""}`
      : "최근 거래 면적을 확인하세요";
  const principal = latestPrice > 0 ? latestPrice.toLocaleString() : "30000";

  return (
    <section className="mb-6 border-y t-border py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300">다음 판단 포인트</p>
          <h2 className="mt-1 text-lg font-extrabold t-text">
            {aptName}에서 먼저 확인할 신호
          </h2>
          <p className="mt-1 text-sm t-text-secondary">
            가격 위치, 거래 맥락, 대출 부담을 이어서 확인할 수 있게 정리했습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TrackedLink
            href={`/compare?ids=${encodeURIComponent(complexId)}`}
            ctaName="apt_decision_compare_click"
            params={{ complex_id: complexId }}
            className="inline-flex min-h-10 items-center rounded-lg border t-border px-3 text-xs font-bold t-text-secondary transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            비교하기
          </TrackedLink>
          <TrackedLink
            href={`/rate/calculator?tab=loan&principal=${principal}`}
            ctaName="apt_decision_calculator_click"
            params={{ complex_id: complexId, latest_price: latestPrice }}
            className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700"
          >
            대출 계산
          </TrackedLink>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem
          label="최근 거래"
          value={latestPrice > 0 ? formatPrice(latestPrice) : "-"}
          hint={latestMeta}
        />
        <SummaryItem
          label="최고가 대비"
          value={changeValue}
          hint={highestPrice > 0 ? `역대 최고 ${formatPrice(highestPrice)} 기준` : "최고가 집계 전입니다"}
          tone={changeNumber !== null && changeNumber < 0 ? "drop" : "rise"}
        />
        <SummaryItem
          label="전월세 참고"
          value={rentCount > 0 ? `${rentCount.toLocaleString()}건` : "-"}
          hint="전세가율과 갭을 같이 보면 가격 신호를 더 잘 읽을 수 있습니다"
        />
        <SummaryItem
          label="주변 비교"
          value={nearbyCount > 0 ? `${nearbyCount}개 단지` : "-"}
          hint="같은 동네 단지와 가격 위치를 비교해보세요"
        />
      </div>
    </section>
  );
}
