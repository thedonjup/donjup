"use client";

export default function UsersManagement() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>회원 관리</h1>

      <div
        className="rounded-lg border p-8 text-center"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}
      >
        <div className="mb-4 text-4xl">👥</div>
        <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Firebase Admin SDK 연동 후 회원 목록이 표시됩니다
        </h2>
        <p className="mb-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          서버 사이드에서 Firebase Admin SDK를 사용하여 사용자 목록을 조회할 수 있습니다.
          현재는 클라이언트 SDK만 설정되어 있어 사용자 목록 조회가 제한됩니다.
        </p>
        <a
          href="https://console.firebase.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          style={{ background: "#f59e0b" }}
        >
          Firebase Console 열기
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
