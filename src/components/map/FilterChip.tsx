"use client";

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}

export default function FilterChip({
  active,
  onClick,
  color,
  children,
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? color : "var(--color-surface-elevated)",
        color: active ? "#fff" : "var(--color-text-secondary)",
      }}
    >
      {children}
    </button>
  );
}
