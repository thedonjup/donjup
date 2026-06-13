import { searchHighlightSegments } from "@/lib/search-highlight";

interface HighlightedTextProps {
  text: string;
  query: string;
  markClassName?: string;
}

export default function HighlightedText({
  text,
  query,
  markClassName = "rounded bg-brand-100 px-0.5 text-brand-900",
}: HighlightedTextProps) {
  const segments = searchHighlightSegments(text, query);

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={`${segment.text}-${index}`} className={markClassName}>
            {segment.text}
          </mark>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </>
  );
}
