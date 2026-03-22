export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="donjup-spinner">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white">
          ₩
        </div>
      </div>
      <p
        className="mt-4 text-sm font-medium"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        불러오는 중...
      </p>
      <style>{`
        .donjup-spinner {
          animation: donjup-pulse 1.2s ease-in-out infinite;
        }
        @keyframes donjup-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.92); }
        }
      `}</style>
    </div>
  );
}
