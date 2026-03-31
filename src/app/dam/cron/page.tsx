"use client";

import { useState } from "react";

interface CronJob {
  name: string;
  route: string;
  schedule: string;
  description: string;
}

const CRON_JOBS: CronJob[] = [
  { name: "실거래가 수집 (배치 0)", route: "fetch-transactions?batch=0", schedule: "매일 06:00", description: "서울, 부산, 대구 실거래가" },
  { name: "실거래가 수집 (배치 1)", route: "fetch-transactions?batch=1", schedule: "매일 07:00", description: "인천, 광주, 대전, 울산, 세종" },
  { name: "실거래가 수집 (배치 2)", route: "fetch-transactions?batch=2", schedule: "매일 08:00", description: "경기도 실거래가" },
  { name: "실거래가 수집 (배치 3)", route: "fetch-transactions?batch=3", schedule: "매일 09:00", description: "강원, 충북, 충남, 전북" },
  { name: "실거래가 수집 (배치 4)", route: "fetch-transactions?batch=4", schedule: "매일 10:00", description: "전남, 경북, 경남, 제주" },
  { name: "다가구 실거래가", route: "fetch-transactions?type=multi", schedule: "매일 10:30", description: "연립다세대 실거래가" },
  { name: "전월세 수집 (배치 0)", route: "fetch-rents?batch=0", schedule: "매일 11:00", description: "수도권 전월세" },
  { name: "전월세 수집 (배치 1)", route: "fetch-rents?batch=1", schedule: "매일 11:10", description: "비수도권 전월세" },
  { name: "전월세 수집 (배치 2)", route: "fetch-rents?batch=2", schedule: "매일 11:20", description: "기타 지역 전월세" },
  { name: "단지 보강", route: "enrich-complexes", schedule: "매일 12:00", description: "단지 정보 보강 (highest_price 등)" },
  { name: "지오코딩", route: "geocode-complexes", schedule: "매일 12:30", description: "단지 좌표 정보 수집" },
  { name: "은행 금리 수집", route: "fetch-bank-rates", schedule: "매일 13:00", description: "주담대/전세대출 금리" },
  { name: "한국은행 금리", route: "fetch-rates", schedule: "매일 13:30", description: "기준금리, COFIX 등" },
  { name: "부동산 지수", route: "fetch-reb-index", schedule: "매일 13:45", description: "KB/한국부동산원 지수" },
  { name: "데이터 검증", route: "validate-data", schedule: "매일 14:00", description: "데이터 정합성 검사" },
  { name: "카드뉴스 생성", route: "generate-cardnews", schedule: "매일 15:00", description: "AI 카드뉴스 자동 생성" },
  { name: "데일리 리포트", route: "generate-report", schedule: "매일 15:30", description: "일간 분석 리포트 생성" },
  { name: "시딩 콘텐츠", route: "generate-seeding", schedule: "매일 15:45", description: "커뮤니티 시딩 콘텐츠" },
  { name: "인스타 발행", route: "post-instagram", schedule: "매일 16:00", description: "인스타그램 자동 발행" },
  { name: "푸시 발송", route: "send-push", schedule: "매일 17:00", description: "웹푸시 알림 발송" },
  { name: "뉴스 수집", route: "news", schedule: "매일 08:00", description: "부동산 관련 뉴스 수집" },
  { name: "쿠팡 상품", route: "coupang", schedule: "매일 09:00", description: "쿠팡파트너스 상품 갱신" },
  { name: "GA 분석", route: "analytics", schedule: "매일 23:00", description: "Google Analytics 데이터 수집" },
];

interface RunResult {
  route: string;
  status: "running" | "success" | "failed";
  message: string;
}

export default function CronManagement() {
  const [results, setResults] = useState<Record<string, RunResult>>({});

  const triggerCron = async (job: CronJob) => {
    setResults((prev) => ({
      ...prev,
      [job.route]: { route: job.route, status: "running", message: "실행 중..." },
    }));

    try {
      const res = await fetch(`/api/cron/${job.route}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      setResults((prev) => ({
        ...prev,
        [job.route]: {
          route: job.route,
          status: res.ok ? "success" : "failed",
          message: res.ok
            ? data.message || "성공"
            : `실패 (${res.status}): ${data.error || "Unknown error"}`,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [job.route]: {
          route: job.route,
          status: "failed",
          message: err instanceof Error ? err.message : "네트워크 오류",
        },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          크론잡 관리
        </h1>
        <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-tertiary)" }}>
          총 {CRON_JOBS.length}개
        </span>
      </div>

      <div className="rounded-lg border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>작업명</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>스케줄</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>설명</th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>상태</th>
                <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {CRON_JOBS.map((job) => {
                const result = results[job.route];
                return (
                  <tr key={job.route} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {job.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                        {job.schedule}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {job.description}
                    </td>
                    <td className="px-4 py-3">
                      {result && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background:
                              result.status === "running"
                                ? "var(--color-semantic-warn-bg)"
                                : result.status === "success"
                                ? "var(--color-semantic-rise-bg)"
                                : "var(--color-semantic-drop-bg)",
                            color:
                              result.status === "running"
                                ? "var(--color-semantic-warn)"
                                : result.status === "success"
                                ? "var(--color-semantic-rise)"
                                : "var(--color-semantic-drop)",
                          }}
                        >
                          {result.status === "running" ? "실행 중" : result.status === "success" ? "성공" : "실패"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => triggerCron(job)}
                        disabled={result?.status === "running"}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-80 disabled:opacity-50"
                        style={{ background: "var(--color-brand-600)" }}
                      >
                        {result?.status === "running" ? "실행 중..." : "수동 실행"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result messages */}
      {Object.values(results).filter((r) => r.status !== "running").length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>실행 결과</h2>
          {Object.values(results)
            .filter((r) => r.status !== "running")
            .map((r) => (
              <div
                key={r.route}
                className="rounded-lg px-4 py-2.5 text-xs"
                style={{
                  background: r.status === "success" ? "var(--color-semantic-rise-bg)" : "var(--color-semantic-drop-bg)",
                  color: r.status === "success" ? "var(--color-semantic-rise)" : "var(--color-semantic-drop)",
                }}
              >
                <span className="font-medium">{r.route}</span>: {r.message}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
