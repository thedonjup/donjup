interface SettingSection {
  title: string;
  items: { label: string; value: string; status?: "ok" | "missing" }[];
}

const SETTINGS: SettingSection[] = [
  {
    title: "API 키 상태",
    items: [
      { label: "CockroachDB (DATABASE_URL)", value: process.env.DATABASE_URL ? "설정됨" : "미설정", status: process.env.DATABASE_URL ? "ok" : "missing" },
      { label: "Firebase API Key", value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "설정됨" : "미설정", status: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "ok" : "missing" },
      { label: "Firebase Project ID", value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "설정됨" : "미설정", status: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "ok" : "missing" },
      { label: "Kakao JS Key", value: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ? "설정됨" : "미설정", status: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ? "ok" : "missing" },
      { label: "Google Analytics ID", value: process.env.NEXT_PUBLIC_GA_ID ? "설정됨" : "미설정", status: process.env.NEXT_PUBLIC_GA_ID ? "ok" : "missing" },
      { label: "AdSense ID", value: process.env.NEXT_PUBLIC_ADSENSE_ID ? "설정됨" : "미설정", status: process.env.NEXT_PUBLIC_ADSENSE_ID ? "ok" : "missing" },
      { label: "Admin Emails", value: process.env.ADMIN_EMAILS ? "설정됨" : "미설정", status: process.env.ADMIN_EMAILS ? "ok" : "missing" },
    ],
  },
  {
    title: "크론 스케줄",
    items: [
      { label: "실거래가 수집", value: "매일 06:00-10:30 (5개 배치)" },
      { label: "전월세 수집", value: "매일 11:00-11:20 (3개 배치)" },
      { label: "단지 보강 + 지오코딩", value: "매일 12:00-12:30" },
      { label: "금리/지수 수집", value: "매일 13:00-13:45" },
      { label: "데이터 검증", value: "매일 14:00" },
      { label: "콘텐츠 생성", value: "매일 15:00-15:45" },
      { label: "인스타 발행", value: "매일 16:00" },
      { label: "푸시 발송", value: "매일 17:00" },
    ],
  },
  {
    title: "캐시 설정 (revalidate)",
    items: [
      { label: "메인 페이지", value: "1800초 (30분)" },
      { label: "아파트 상세", value: "3600초 (1시간)" },
      { label: "지역별 페이지", value: "1800초 (30분)" },
      { label: "금리 페이지", value: "3600초 (1시간)" },
      { label: "트렌드 페이지", value: "3600초 (1시간)" },
    ],
  },
  {
    title: "폭락 판정 기준",
    items: [
      { label: "폭락 (crash)", value: "전고점 대비 -30% 이상 하락" },
      { label: "급락 (severe)", value: "전고점 대비 -20% 이상 하락" },
      { label: "하락 (drop)", value: "전고점 대비 -10% 이상 하락" },
      { label: "보합 (flat)", value: "전고점 대비 -10% 미만 변동" },
    ],
  },
  {
    title: "Rate Limit",
    items: [
      { label: "공공데이터 API", value: "1000건/일 (OpenAPI 기준)" },
      { label: "크론 요청", value: "CRON_SECRET 헤더 필수" },
      { label: "CockroachDB", value: "커넥션 풀 5개" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>설정</h1>
      <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        현재 설정값을 확인합니다. 수정 기능은 추후 추가됩니다.
      </p>

      {SETTINGS.map((section) => (
        <div
          key={section.title}
          className="rounded-lg border"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
        >
          <div className="border-b px-5 py-3" style={{ borderColor: "var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {section.title}
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {section.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {item.value}
                  </span>
                  {item.status && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background: item.status === "ok" ? "var(--color-semantic-rise)" : "var(--color-semantic-drop)",
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
