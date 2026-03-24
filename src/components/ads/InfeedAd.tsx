"use client";

import AdSlot from "./AdSlot";

interface InfeedAdProps {
  index: number;
  className?: string;
}

/**
 * 리스트 아이템 사이에 삽입되는 인피드 광고.
 * 매 5번째 아이템 후에 렌더링됩니다 (index가 0-based이므로 4, 9, 14, ...).
 */
export function shouldShowInfeedAd(index: number): boolean {
  return (index + 1) % 5 === 0;
}

export default function InfeedAd({ index, className = "" }: InfeedAdProps) {
  return (
    <AdSlot
      slotId={`list-infeed-${index}`}
      format="infeed"
      className={className}
    />
  );
}
