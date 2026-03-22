import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "돈줍(DonJup) 개인정보처리방침",
};

const SECTIONS = [
  {
    title: "1. 수집하는 개인정보",
    content: "돈줍은 서비스 제공을 위해 최소한의 정보만 수집합니다.",
    list: [
      "자동 수집: 방문 페이지, 방문 시간, 브라우저 유형 (Google Analytics)",
      "웹 푸시 알림 구독 시: 브라우저 푸시 토큰 (개인 식별 불가)",
    ],
  },
  {
    title: "2. 개인정보의 이용 목적",
    list: [
      "서비스 이용 통계 분석 및 서비스 개선",
      "관심 단지 폭락 알림 발송 (웹 푸시 구독 시)",
    ],
  },
  {
    title: "3. 개인정보의 보유 및 파기",
    content:
      "수집된 데이터는 서비스 운영 기간 동안 보유하며, 서비스 종료 시 지체없이 파기합니다. 웹 푸시 구독 해제 시 관련 토큰은 즉시 삭제됩니다.",
  },
  {
    title: "4. 제3자 서비스",
    content: "돈줍은 아래 제3자 서비스를 이용합니다.",
    list: [
      "Google Analytics — 방문 통계 분석",
      "Google AdSense — 광고 표시",
      "Supabase — 데이터 저장",
      "Vercel — 웹사이트 호스팅",
    ],
  },
  {
    title: "5. 쿠키 사용",
    content:
      "돈줍은 서비스 개선 및 광고 제공을 위해 쿠키를 사용할 수 있습니다. 브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 제한될 수 있습니다.",
  },
  {
    title: "6. 문의",
    content: "개인정보 관련 문의: donjupkr@gmail.com",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
        <h1 className="text-2xl font-extrabold t-text">개인정보처리방침</h1>
      </div>
      <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        시행일: 2026년 3월 22일
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            className="rounded-2xl border p-5"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
          >
            <h2 className="font-bold t-text">{s.title}</h2>
            {s.content && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {s.content}
              </p>
            )}
            {s.list && (
              <ul className="mt-2 space-y-1.5">
                {s.list.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
