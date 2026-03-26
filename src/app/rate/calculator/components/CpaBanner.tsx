"use client";

import { trackCalculate } from "@/lib/analytics/events";

export function CpaBanner() {
  const cpaUrl = process.env.NEXT_PUBLIC_CPA_URL;

  return (
    <div className="mt-4 rounded-2xl border-2 border-brand-300 bg-gradient-to-r from-brand-50 to-brand-100/50 p-6 text-center">
      <p className="text-lg font-extrabold text-brand-900">
        더 낮은 금리, 지금 비교해 보세요
      </p>
      <p className="mt-1 text-sm text-brand-700">
        금융사 20곳 이상의 금리를 한 번에 비교하고, 나에게 유리한 대출을 찾아보세요
      </p>
      <a
        href={cpaUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block rounded-xl bg-brand-600 px-8 py-3.5 text-base font-bold text-white transition hover:bg-brand-700 active:scale-[0.98]"
        onClick={() => {
          trackCalculate("cpa_click", {});
        }}
      >
        지금 바로 최저 금리 대출 비교하기
      </a>
      <p className="mt-2 text-[11px] text-brand-500">
        제휴 링크를 통해 돈줍 서비스 운영을 지원할 수 있습니다
      </p>
    </div>
  );
}
