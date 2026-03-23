"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const PROPERTY_TYPES: { value: number; label: string }[] = [
  { value: 1, label: "아파트" },
  { value: 2, label: "빌라" },
  { value: 3, label: "오피스텔" },
  { value: 0, label: "전체" },
];

export const PROPERTY_TYPE_LABELS: Record<number, string> = {
  1: "아파트",
  2: "빌라",
  3: "오피스텔",
};

export default function PropertyTypeFilter({
  currentType = 1,
}: {
  currentType?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = useCallback(
    (value: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 1) {
        params.delete("type");
      } else {
        params.set("type", String(value));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="sticky top-16 z-40 border-b t-border t-card">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
        {PROPERTY_TYPES.map((pt) => (
          <button
            key={pt.value}
            onClick={() => handleSelect(pt.value)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              currentType === pt.value
                ? "bg-brand-600 text-white shadow-sm"
                : "t-text-secondary hover:t-text"
            }`}
            style={
              currentType !== pt.value
                ? { background: "var(--color-surface-elevated)" }
                : undefined
            }
          >
            {pt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
