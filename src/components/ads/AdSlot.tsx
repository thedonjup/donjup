"use client";

import { useEffect, useRef } from "react";

interface AdSlotProps {
  slotId: string;
  format: "banner" | "rectangle" | "infeed" | "responsive";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdSlot({ slotId, format, className = "" }: AdSlotProps) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsenseId || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not ready
    }
  }, [adsenseId]);

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
    >
      <ins
        ref={adRef}
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
