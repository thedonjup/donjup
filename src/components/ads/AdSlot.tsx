"use client";

interface AdSlotProps {
  slotId: string;
  format: "banner" | "rectangle" | "infeed" | "responsive";
  className?: string;
}

/**
 * 광고 슬롯 컴포넌트
 * - 애드센스 승인 전: 카카오 애드핏 또는 플레이스홀더 표시
 * - 애드센스 승인 후: 구글 애드센스 코드로 교체
 */
export default function AdSlot({ slotId, format, className = "" }: AdSlotProps) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

  // 애드센스 ID가 없으면 표시하지 않음 (개발/승인 전)
  if (!adsenseId) {
    return null;
  }

  const sizeClass = {
    banner: "min-h-[90px]",
    rectangle: "min-h-[250px]",
    infeed: "min-h-[100px]",
    responsive: "min-h-[100px]",
  }[format];

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${sizeClass} ${className}`}
      data-ad-slot={slotId}
      data-ad-format={format}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseId}
        data-ad-slot={slotId}
        data-ad-format={format === "responsive" ? "auto" : undefined}
        data-full-width-responsive={format === "responsive" ? "true" : undefined}
      />
    </div>
  );
}
