import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 소개",
  description: "돈줍(DonJup) - 매일 자동 업데이트되는 부동산 실거래가 폭락/신고가 랭킹과 금리 정보 서비스",
  alternates: { canonical: "/about" },
};

const FEATURES = [
  {
    icon: "📊",
    title: "매일 자동 업데이트",
    desc: "국토교통부 공공데이터를 매일 밤 자동 수집하여 최신 실거래가 정보를 제공합니다.",
  },
  {
    icon: "📉",
    title: "극단적 데이터 필터링",
    desc: "최고가 대비 폭락 거래, 신고가 갱신 거래를 자동으로 추출하여 랭킹으로 보여줍니다.",
  },
  {
    icon: "💰",
    title: "금리 대시보드",
    desc: "기준금리, COFIX, CD금리 등 주요 금리 지표를 차트와 함께 한눈에 확인할 수 있습니다.",
  },
  {
    icon: "🏠",
    title: "대출 이자 계산기",
    desc: "원리금균등/원금균등/만기일시 3가지 방식을 비교하고 금리 변동 시나리오를 확인하세요.",
  },
];

const DATA_SOURCES = [
  { name: "국토교통부", desc: "실거래가 공개시스템 (공공데이터포털)" },
  { name: "한국은행", desc: "경제통계시스템 (ECOS)" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white">
          ₩
        </div>
        <h1 className="mt-4 text-2xl font-extrabold t-text">돈줍(DonJup)</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          부동산과 돈의 흐름을 압축해서 보여주는 곳
        </p>
      </div>

      {/* Intro */}
      <div
        className="mt-8 rounded-2xl border p-6 text-center"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
      >
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          <strong className="t-text">돈줍</strong>은 매일 자동으로 업데이트되는 전국 부동산 실거래가
          분석 서비스입니다. 서울, 부산, 대구, 인천, 경기 등 전국 17개 시/도의
          국토교통부 공공데이터와 한국은행 금리 데이터를 자동 수집하여, 아파트
          폭락/신고가 랭킹과 대출 금리 변동 정보를 제공합니다.
        </p>
      </div>

      {/* Features */}
      <h2 className="mt-10 text-lg font-bold t-text">서비스 특징</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border p-5"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{ background: "var(--color-surface-elevated)" }}
            >
              {f.icon}
            </div>
            <p className="mt-3 font-semibold t-text">{f.title}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Data Sources */}
      <h2 className="mt-10 text-lg font-bold t-text">데이터 출처</h2>
      <div className="mt-4 space-y-2">
        {DATA_SOURCES.map((ds) => (
          <div
            key={ds.name}
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
              공
            </span>
            <div>
              <p className="text-sm font-semibold t-text">{ds.name}</p>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{ds.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div
        className="mt-10 rounded-2xl border p-5"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-elevated)" }}
      >
        <h2 className="text-sm font-bold t-text">면책 조항</h2>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          본 서비스에서 제공하는 데이터는 공공데이터를 가공한 참고 자료이며,
          투자 판단의 근거로 사용할 수 없습니다. 투자에 따른 손실은 투자자
          본인에게 귀속됩니다.
        </p>
      </div>

      {/* Contact */}
      <div className="mt-8 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
          문의: donjup.official@gmail.com
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            서비스 이용하기
          </Link>
          <a
            href="https://instagram.com/donjup.official"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border px-5 py-2 text-sm font-bold transition hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          >
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
