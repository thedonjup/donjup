"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { trackCtaClick } from "@/lib/analytics/events";

interface TrackedLinkProps {
  href: string;
  ctaName: string;
  params?: Record<string, string | number | boolean | undefined>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  ariaLabel?: string;
}

export default function TrackedLink({
  href,
  ctaName,
  params,
  className,
  style,
  children,
  ariaLabel,
}: TrackedLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={className}
      style={style}
      onClick={() => trackCtaClick(ctaName, params)}
    >
      {children}
    </Link>
  );
}
