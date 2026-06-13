import TrackedLink from "@/components/analytics/TrackedLink";
import ShareButtons from "@/components/ShareButtons";
import FavoriteButton from "@/components/apt/FavoriteButton";
import NotifyButton from "@/components/apt/NotifyButton";
import { formatPrice } from "@/lib/format";

const actionButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80";

const actionButtonStyle = {
  borderColor: "var(--color-border)",
  color: "var(--color-text-secondary)",
  background: "var(--color-surface-card)",
};

interface AptDetailActionsProps {
  aptName: string;
  regionName: string;
  contentId: string;
  complexId: string;
  detailUrl: string;
  latestPrice: number;
  hasLocation: boolean;
}

export default function AptDetailActions({
  aptName,
  regionName,
  contentId,
  complexId,
  detailUrl,
  latestPrice,
  hasLocation,
}: AptDetailActionsProps) {
  const shareDescription = latestPrice > 0
    ? `${aptName} 최근 거래가 ${formatPrice(latestPrice)} | 돈줍`
    : `${aptName} 실거래가 | 돈줍`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FavoriteButton
        govtComplexId={contentId}
        aptName={aptName}
        regionName={regionName}
      />
      <NotifyButton
        aptName={aptName}
        contentId={contentId}
        latestPrice={latestPrice > 0 ? latestPrice : undefined}
      />
      <TrackedLink
        href={`/compare?ids=${encodeURIComponent(complexId)}`}
        ctaName="apt_header_compare_click"
        params={{ content_id: contentId, complex_id: complexId }}
        className={actionButtonClass}
        style={actionButtonStyle}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-4 3 3 5-7" />
        </svg>
        비교
      </TrackedLink>
      {hasLocation && (
        <TrackedLink
          href={`/map?complex=${encodeURIComponent(complexId)}`}
          ctaName="apt_header_map_click"
          params={{ content_id: contentId, complex_id: complexId }}
          className={actionButtonClass}
          style={actionButtonStyle}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1116 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          지도
        </TrackedLink>
      )}
      <ShareButtons
        url={`https://donjup.com${detailUrl}`}
        title={`${aptName} 실거래가`}
        description={shareDescription}
      />
    </div>
  );
}
