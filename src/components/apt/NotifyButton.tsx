"use client";

export default function NotifyButton({ aptName }: { aptName: string }) {
  function handleClick() {
    alert(`[${aptName}] 알림 기능은 준비 중입니다.`);
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
      style={{
        borderColor: "var(--color-border)",
        color: "var(--color-text-secondary)",
        background: "var(--color-surface-card)",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      이 단지 알림 받기
    </button>
  );
}
